import JSZip from 'jszip'
import { supabase } from './supabase'

export interface CertificateData {
  traineeName: string
  traineeEmail?: string
  traineeId: string
  courseId: string
  courseTitle: string
  trainerName?: string
  percentage?: number | string
  completedAt?: string
  certificateId?: string
}

/**
 * Replaces placeholders in PPTX slide XML, handling both simple text and split XML runs.
 */
function replacePlaceholdersInXml(xmlContent: string, data: CertificateData): string {
  const percentageStr = typeof data.percentage === 'number' 
    ? `${Math.round(data.percentage)}%` 
    : data.percentage || '100%'

  const formattedDate = data.completedAt 
    ? new Date(data.completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const replacements: Record<string, string> = {
    '<<NAME>>': data.traineeName,
    '&lt;&lt;NAME&gt;&gt;': data.traineeName,
    '{{NAME}}': data.traineeName,
    '[NAME]': data.traineeName,
    '<<PERCENTAGE>>': percentageStr,
    '&lt;&lt;PERCENTAGE&gt;&gt;': percentageStr,
    '{{PERCENTAGE}}': percentageStr,
    '[PERCENTAGE]': percentageStr,
    '<<SCORE>>': percentageStr,
    '&lt;&lt;SCORE&gt;&gt;': percentageStr,
    '<<COURSE_NAME>>': data.courseTitle,
    '&lt;&lt;COURSE_NAME&gt;&gt;': data.courseTitle,
    '<<COURSE>>': data.courseTitle,
    '&lt;&lt;COURSE&gt;&gt;': data.courseTitle,
    '<<DATE>>': formattedDate,
    '&lt;&lt;DATE&gt;&gt;': formattedDate,
    '<<TRAINER_NAME>>': data.trainerName || 'Lead Trainer',
    '&lt;&lt;TRAINER_NAME&gt;&gt;': data.trainerName || 'Lead Trainer',
    '<<CERTIFICATE_ID>>': data.certificateId || `CC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
  }

  let result = xmlContent

  // 1. Direct string replacement
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(key).join(escapeXml(value))
  }

  // 2. Paragraph-level replacement for split XML tags like <a:r><a:t>&lt;&lt;</a:t></a:r><a:r><a:t>NAME</a:t></a:r><a:r><a:t>&gt;&gt;</a:t></a:r>
  result = result.replace(/<a:p[\s\S]*?<\/a:p>/g, (paragraph) => {
    let pText = paragraph
    for (const [key, value] of Object.entries(replacements)) {
      if (!pText.includes(key)) {
        // Test if paragraph's text content stripped of XML contains key
        const textOnly = pText.replace(/<[^>]+>/g, '')
        if (textOnly.includes(key)) {
          // Replace first <a:t> content and empty the others inside this paragraph
          let firstReplaced = false
          pText = pText.replace(/<a:t>([\s\S]*?)<\/a:t>/g, (match, textVal) => {
            if (!firstReplaced) {
              firstReplaced = true
              return `<a:t>${escapeXml(textOnly.replace(new RegExp(escapeRegex(key), 'g'), value))}</a:t>`
            }
            return `<a:t></a:t>`
          })
        }
      }
    }
    return pText
  })

  return result
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Triggers a file download in the browser
 */
export function triggerFileDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Generates a customized PPTX certificate by replacing placeholders in a template
 */
export async function generateTraineeCertificate(
  templateUrl: string | null | undefined,
  data: CertificateData
): Promise<{ blob: Blob; fileName: string; storageUrl?: string }> {
  let templateBuffer: ArrayBuffer

  if (templateUrl) {
    // Fetch template from URL
    try {
      const response = await fetch(templateUrl)
      if (!response.ok) throw new Error(`Failed to fetch template: ${response.statusText}`)
      templateBuffer = await response.arrayBuffer()
    } catch (err) {
      console.warn('Could not fetch custom template, falling back to default starter template:', err)
      templateBuffer = await createDefaultPptxTemplate(data.courseTitle)
    }
  } else {
    // Generate default MoES starter PPTX template
    templateBuffer = await createDefaultPptxTemplate(data.courseTitle)
  }

  // Load PPTX with JSZip
  const zip = await JSZip.loadAsync(templateBuffer)

  // Find and update all slide XML files
  const slideFiles = Object.keys(zip.files).filter(
    fileName => fileName.startsWith('ppt/slides/slide') && fileName.endsWith('.xml')
  )

  for (const fileName of slideFiles) {
    const slideXml = await zip.file(fileName)?.async('string')
    if (slideXml) {
      const updatedXml = replacePlaceholdersInXml(slideXml, data)
      zip.file(fileName, updatedXml)
    }
  }

  // Also check notes & presentation files
  const otherFiles = Object.keys(zip.files).filter(
    fileName => (fileName.startsWith('ppt/notesSlides/') || fileName === 'ppt/presentation.xml') && fileName.endsWith('.xml')
  )
  for (const fileName of otherFiles) {
    const xml = await zip.file(fileName)?.async('string')
    if (xml) {
      const updatedXml = replacePlaceholdersInXml(xml, data)
      zip.file(fileName, updatedXml)
    }
  }

  // Generate output PPTX blob
  const outputBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  })

  const safeTraineeName = data.traineeName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeCourseName = data.courseTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)
  const fileName = `${safeTraineeName}_${safeCourseName}_Certificate.pptx`

  // Upload certificate to 'certificates' bucket
  let storageUrl: string | undefined
  try {
    const storagePath = `${data.courseId}/${data.traineeId}_${Date.now()}.pptx`
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('certificates')
      .upload(storagePath, outputBlob, {
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: true,
      })

    if (!uploadErr && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from('certificates')
        .getPublicUrl(storagePath)
      storageUrl = publicUrlData.publicUrl

      // Record in public.certificates table if available
      try {
        const percentageNum = typeof data.percentage === 'number' 
          ? data.percentage 
          : parseFloat(String(data.percentage).replace('%', '')) || 100

        await (supabase as any).from('certificates').upsert({
          course_id: data.courseId,
          trainee_id: data.traineeId,
          trainee_name: data.traineeName,
          course_title: data.courseTitle,
          percentage: percentageNum,
          file_url: storageUrl,
          file_name: fileName,
          issued_at: new Date().toISOString(),
        }, { onConflict: 'course_id,trainee_id' })
      } catch (dbErr) {
        console.warn('Could not record certificate in DB table:', dbErr)
      }
    }
  } catch (storageErr) {
    console.warn('Storage upload error (proceeding with direct download):', storageErr)
  }

  return { blob: outputBlob, fileName, storageUrl }
}

/**
 * Creates a clean, standalone default MoES Capacity Connect PPTX certificate template
 */
export async function createDefaultPptxTemplate(courseTitle = 'Advanced Ocean & Atmospheric Studies'): Promise<ArrayBuffer> {
  const zip = new JSZip()

  // [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
</Types>`)

  // _rels/.rels
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`)

  // ppt/_rels/presentation.xml.rels
  zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`)

  // ppt/presentation.xml
  zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId2"/>
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`)

  // ppt/slides/_rels/slide1.xml.rels
  zip.file('ppt/slides/_rels/slide1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`)

  // ppt/slides/slide1.xml (Slide with certificate design and placeholders)
  zip.file('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>

      <!-- Background Border Box -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Border"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="457200" y="381000"/>
            <a:ext cx="11277600" cy="6096000"/>
          </a:xfrm>
          <a:prstGeom prst="roundRect">
            <a:avLst>
              <a:gd name="adj" fmla="val 2000"/>
            </a:avLst>
          </a:prstGeom>
          <a:solidFill>
            <a:srgbClr val="040814"/>
          </a:solidFill>
          <a:ln w="38100">
            <a:solidFill>
              <a:srgbClr val="06B6D4"/>
            </a:solidFill>
          </a:ln>
        </p:spPr>
      </p:sp>

      <!-- Certificate Header Title -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Title"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="762000"/>
            <a:ext cx="10363200" cy="838200"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr" wrap="square"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="1600" b="1">
                <a:solidFill>
                  <a:srgbClr val="38BDF8"/>
                </a:solidFill>
              </a:rPr>
              <a:t>MINISTRY OF EARTH SCIENCES • CAPACITY CONNECT</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="3600" b="1">
                <a:solidFill>
                  <a:srgbClr val="FFFFFF"/>
                </a:solidFill>
              </a:rPr>
              <a:t>CERTIFICATE OF COMPLETION</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- "This is proudly presented to" -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Subtitle"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="1905000"/>
            <a:ext cx="10363200" cy="457200"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr" wrap="square"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="1400" i="1">
                <a:solidFill>
                  <a:srgbClr val="94A3B8"/>
                </a:solidFill>
              </a:rPr>
              <a:t>This is proudly presented to</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- Trainee Name Placeholder <<NAME>> -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="5" name="TraineeName"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="2438400"/>
            <a:ext cx="10363200" cy="838200"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr" wrap="square"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="3800" b="1">
                <a:solidFill>
                  <a:srgbClr val="06B6D4"/>
                </a:solidFill>
              </a:rPr>
              <a:t>&lt;&lt;NAME&gt;&gt;</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- Course & Percentage Text -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="6" name="BodyText"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1524000" y="3429000"/>
            <a:ext cx="9144000" cy="1143000"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr" wrap="square"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="1500">
                <a:solidFill>
                  <a:srgbClr val="CBD5E1"/>
                </a:solidFill>
              </a:rPr>
              <a:t>for successfully completing the specialized training program in </a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="2000" b="1">
                <a:solidFill>
                  <a:srgbClr val="FFFFFF"/>
                </a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(courseTitle)}</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="1400">
                <a:solidFill>
                  <a:srgbClr val="94A3B8"/>
                </a:solidFill>
              </a:rPr>
              <a:t>with an academic proficiency and course assessment score of </a:t>
            </a:r>
            <a:r>
              <a:rPr lang="en-US" sz="1800" b="1">
                <a:solidFill>
                  <a:srgbClr val="34D399"/>
                </a:solidFill>
              </a:rPr>
              <a:t>&lt;&lt;PERCENTAGE&gt;&gt;</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- Signatures and Date -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="7" name="FooterSignatures"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1219200" y="5029200"/>
            <a:ext cx="9753600" cy="914400"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr" wrap="square"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="1300" b="1">
                <a:solidFill>
                  <a:srgbClr val="38BDF8"/>
                </a:solidFill>
              </a:rPr>
              <a:t>Date of Issue: &lt;&lt;DATE&gt;&gt;   •   Certificate ID: &lt;&lt;CERTIFICATE_ID&gt;&gt;</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="1200">
                <a:solidFill>
                  <a:srgbClr val="64748B"/>
                </a:solidFill>
              </a:rPr>
              <a:t>Capacity Building &amp; Knowledge Transfer Portal | MoES Capacity Connect</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

    </p:spTree>
  </p:cSld>
</p:sld>`)

  // ppt/slideLayouts/slideLayout1.xml
  zip.file('ppt/slideLayouts/slideLayout1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sldLayout>`)

  // ppt/slideLayouts/_rels/slideLayout1.xml.rels
  zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`)

  // ppt/slideMasters/slideMaster1.xml
  zip.file('ppt/slideMasters/slideMaster1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>`)

  // ppt/slideMasters/_rels/slideMaster1.xml.rels
  zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`)

  // ppt/theme/theme1.xml
  zip.file('ppt/theme/theme1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="1F497D"/></a:dk2>
      <a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
      <a:accent1><a:srgbClr val="06B6D4"/></a:accent1>
      <a:accent2><a:srgbClr val="0284C7"/></a:accent2>
      <a:accent3><a:srgbClr val="10B981"/></a:accent3>
      <a:accent4><a:srgbClr val="8B5CF6"/></a:accent4>
      <a:accent5><a:srgbClr val="F59E0B"/></a:accent5>
      <a:accent6><a:srgbClr val="EC4899"/></a:accent6>
      <a:hlink><a:srgbClr val="38BDF8"/></a:hlink>
      <a:folHlink><a:srgbClr val="94A3B8"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont><a:latin typeface="Calibri"/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`)

  return await zip.generateAsync({ type: 'arraybuffer' })
}
