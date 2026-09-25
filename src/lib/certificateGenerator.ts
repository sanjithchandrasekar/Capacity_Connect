import { jsPDF } from 'jspdf'
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
 * Helper to draw text with letter spacing
 */
function drawCenteredSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  spacingPx: number
) {
  if ('letterSpacing' in ctx) {
    try {
      ;(ctx as any).letterSpacing = `${spacingPx}px`
      ctx.textAlign = 'center'
      ctx.fillText(text, centerX, y)
      ;(ctx as any).letterSpacing = '0px'
      return
    } catch {
      // fallback if letterSpacing assignment fails
    }
  }

  const chars = text.split('')
  ctx.textAlign = 'center'
  const charWidths = chars.map(c => ctx.measureText(c).width)
  const totalWidth = charWidths.reduce((a, b) => a + b, 0) + (chars.length - 1) * spacingPx
  let currentX = centerX - totalWidth / 2

  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], currentX + charWidths[i] / 2, y)
    currentX += charWidths[i] + spacingPx
  }
}

/**
 * Generates an exact 1-to-1 matching PDF certificate conforming to DBMS_Certificate_Template.pptx
 * Only dynamic texts (trainee name, course title, percentage score, date, trainer name) are replaced.
 */
export async function generatePdfCertificate(data: CertificateData): Promise<Blob> {
  // 16:9 Standard widescreen presentation canvas (high-res 2400 x 1350)
  const width = 2400
  const height = 1350

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable')
  }

  // 1. Pure Crisp White Background
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  // Scaling factor: PPTX uses 12192000 x 6858000 EMU
  const scale = width / 12192000

  // 2. Outer Deep Navy Border (Shape 0)
  // PPTX: x=365760, y=365760, w=11457432, h=6126480, line width 38100 (3pt), color #1F3864
  ctx.strokeStyle = '#1F3864'
  ctx.lineWidth = 7.5
  ctx.strokeRect(365760 * scale, 365760 * scale, 11457432 * scale, 6126480 * scale)

  // 3. Inner Muted Gold Border (Shape 1)
  // PPTX: x=548640, y=548640, w=11091672, h=5760720, line width 15875 (1.25pt), color #B8892B
  ctx.strokeStyle = '#B8892B'
  ctx.lineWidth = 3.2
  ctx.strokeRect(548640 * scale, 548640 * scale, 11091672 * scale, 5760720 * scale)

  // 4. Header: "CERTIFICATE" (Text 2)
  // PPTX: Georgia bold 46pt, color #1F3864, letter-spacing 6pt
  ctx.fillStyle = '#1F3864'
  ctx.font = 'bold 84px "Georgia", "Times New Roman", serif'
  drawCenteredSpacedText(ctx, 'CERTIFICATE', width / 2, 275, 12)

  // 5. Subtitle: "OF COMPLETION" (Text 3)
  // PPTX: Georgia 20pt, color #B8892B, letter-spacing 8pt
  ctx.fillStyle = '#B8892B'
  ctx.font = '36px "Georgia", "Times New Roman", serif'
  drawCenteredSpacedText(ctx, 'OF COMPLETION', width / 2, 395, 14)

  // 6. Lead-in: "This is to certify that" (Text 4)
  // PPTX: Georgia italic 16pt, color #595959
  ctx.fillStyle = '#595959'
  ctx.font = 'italic 30px "Georgia", "Times New Roman", serif'
  ctx.textAlign = 'center'
  ctx.fillText('This is to certify that', width / 2, 535)

  // 7. Dynamic Trainee Name: <<NAME>> (Text 5)
  // PPTX: Georgia bold 40pt, color #1F3864
  ctx.fillStyle = '#1F3864'
  ctx.font = 'bold 74px "Georgia", "Times New Roman", serif'
  ctx.textAlign = 'center'
  ctx.fillText(data.traineeName || 'Trainee Name', width / 2, 665)

  // 8. Description: "has successfully completed the training course" (Text 6)
  // PPTX: Georgia italic 16pt, color #595959
  ctx.fillStyle = '#595959'
  ctx.font = 'italic 30px "Georgia", "Times New Roman", serif'
  ctx.textAlign = 'center'
  ctx.fillText('has successfully completed the training course', width / 2, 795)

  // 9. Dynamic Course Title: <<COURSE_NAME>> (Text 7)
  // PPTX: Georgia bold 24pt, color #1F3864
  ctx.fillStyle = '#1F3864'
  ctx.font = 'bold 44px "Georgia", "Times New Roman", serif'
  ctx.textAlign = 'center'
  ctx.fillText(data.courseTitle || 'Course Title', width / 2, 895)

  // 10. Dynamic Score / Percentage: "with a final score of <<PERCENTAGE>>" (Text 8)
  const percentageStr = typeof data.percentage === 'number'
    ? `${data.percentage}%`
    : data.percentage
    ? String(data.percentage).includes('%') ? String(data.percentage) : `${data.percentage}%`
    : '100%'

  const textPart1 = 'with a final score of '
  ctx.font = 'italic 30px "Georgia", "Times New Roman", serif'
  const widthPart1 = ctx.measureText(textPart1).width
  ctx.font = 'bold 30px "Georgia", "Times New Roman", serif'
  const widthPart2 = ctx.measureText(percentageStr).width
  const totalScoreWidth = widthPart1 + widthPart2
  const scoreStartX = width / 2 - totalScoreWidth / 2

  ctx.textAlign = 'left'
  ctx.fillStyle = '#595959'
  ctx.font = 'italic 30px "Georgia", "Times New Roman", serif'
  ctx.fillText(textPart1, scoreStartX, 995)

  ctx.fillStyle = '#1F3864'
  ctx.font = 'bold 30px "Georgia", "Times New Roman", serif'
  ctx.fillText(percentageStr, scoreStartX + widthPart1, 995)

  // 11. Left Footer: Date Block (Shape 9, Text 10, Text 11)
  // PPTX Line: x=1280160, y=5760720, w=2926080, line width 12700 (1pt), color #595959
  const dateLineX1 = 1280160 * scale
  const dateLineX2 = (1280160 + 2926080) * scale
  const dateLineY = 5760720 * scale
  const dateCenterX = (dateLineX1 + dateLineX2) / 2

  // Date Underline
  ctx.strokeStyle = '#595959'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(dateLineX1, dateLineY)
  ctx.lineTo(dateLineX2, dateLineY)
  ctx.stroke()

  // Date Value: <<DATE>> (Text 10)
  const formattedDate = data.completedAt
    ? new Date(data.completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  ctx.textAlign = 'center'
  ctx.fillStyle = '#1F3864'
  ctx.font = 'bold 28px "Georgia", "Times New Roman", serif'
  ctx.fillText(formattedDate, dateCenterX, dateLineY - 18)

  // Date Label: "Date of Issue" (Text 11)
  ctx.fillStyle = '#595959'
  ctx.font = '22px "Georgia", "Times New Roman", serif'
  ctx.fillText('Date of Issue', dateCenterX, dateLineY + 38)

  // 12. Right Footer: Instructor Block (Shape 12, Text 13, Text 14)
  // PPTX Line: x=7982712, y=5760720, w=2926080, line width 12700 (1pt), color #595959
  const instLineX1 = 7982712 * scale
  const instLineX2 = (7982712 + 2926080) * scale
  const instLineY = 5760720 * scale
  const instCenterX = (instLineX1 + instLineX2) / 2

  // Instructor Underline
  ctx.strokeStyle = '#595959'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(instLineX1, instLineY)
  ctx.lineTo(instLineX2, instLineY)
  ctx.stroke()

  // Trainer Name: <<TRAINER_NAME>> (Text 13)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#1F3864'
  ctx.font = 'bold 28px "Georgia", "Times New Roman", serif'
  ctx.fillText(data.trainerName || 'Lead Instructor', instCenterX, instLineY - 18)

  // Instructor Label: "Lead Instructor" (Text 14)
  ctx.fillStyle = '#595959'
  ctx.font = '22px "Georgia", "Times New Roman", serif'
  ctx.fillText('Lead Instructor', instCenterX, instLineY + 38)

  // Convert canvas to High Quality PNG image
  const imgDataUrl = canvas.toDataURL('image/png', 1.0)

  // Create jsPDF in exact 16:9 standard slide dimensions (338.67 mm x 190.5 mm)
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [338.67, 190.5],
    compress: true,
  })

  // Render image to cover full PDF page precisely
  pdf.addImage(imgDataUrl, 'PNG', 0, 0, 338.67, 190.5, undefined, 'FAST')

  return pdf.output('blob')
}

/**
 * Generates a customized PDF certificate and saves it to Supabase storage
 */
export async function generateTraineeCertificate(
  _templateUrl: string | null | undefined,
  data: CertificateData
): Promise<{ blob: Blob; fileName: string; storageUrl?: string }> {
  const outputBlob = await generatePdfCertificate(data)

  const safeTraineeName = (data.traineeName || 'Trainee').replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeCourseName = (data.courseTitle || 'Course').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)
  const fileName = `${safeTraineeName}_${safeCourseName}_Certificate.pdf`

  let storageUrl: string | undefined
  try {
    const storagePath = `${data.courseId}/${data.traineeId}_${Date.now()}.pdf`
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('certificates')
      .upload(storagePath, outputBlob, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (!uploadErr && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from('certificates')
        .getPublicUrl(storagePath)
      storageUrl = publicUrlData.publicUrl

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
    console.warn('Storage upload error (proceeding with direct PDF download):', storageErr)
  }

  return { blob: outputBlob, fileName, storageUrl }
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Creates a clean, standalone default MoES Capacity Connect PPTX certificate template matching DBMS_Certificate_Template.pptx
 */
export async function createDefaultPptxTemplate(courseTitle = 'Database Management Systems (DBMS)'): Promise<ArrayBuffer> {
  const zip = new JSZip()

  // [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
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
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1" autoCompressPictures="0">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId2"/>
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="12192000"/>
</p:presentation>`)

  // ppt/slides/_rels/slide1.xml.rels
  zip.file('ppt/slides/_rels/slide1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`)

  // ppt/slides/slide1.xml matching DBMS_Certificate_Template.pptx
  zip.file('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld name="Slide 1">
    <p:bg>
      <p:bgPr>
        <a:solidFill>
          <a:srgbClr val="FFFFFF"/>
        </a:solidFill>
      </p:bgPr>
    </p:bg>
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

      <!-- Shape 0: Outer Navy Border -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Shape 0"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="365760" y="365760"/>
            <a:ext cx="11457432" cy="6126480"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
          <a:ln w="38100">
            <a:solidFill>
              <a:srgbClr val="1F3864"/>
            </a:solidFill>
            <a:prstDash val="solid"/>
          </a:ln>
        </p:spPr>
      </p:sp>

      <!-- Shape 1: Inner Gold Border -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Shape 1"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="548640" y="548640"/>
            <a:ext cx="11091672" cy="5760720"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
          <a:ln w="15875">
            <a:solidFill>
              <a:srgbClr val="B8892B"/>
            </a:solidFill>
            <a:prstDash val="solid"/>
          </a:ln>
        </p:spPr>
      </p:sp>

      <!-- Text 2: CERTIFICATE -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Text 2"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="914400"/>
            <a:ext cx="10360152" cy="822960"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr" indent="0" marL="0"><a:buNone/></a:pPr>
            <a:r>
              <a:rPr lang="en-US" sz="4600" b="1" spc="600" kern="0">
                <a:solidFill><a:srgbClr val="1F3864"/></a:solidFill>
                <a:latin typeface="Georgia" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>CERTIFICATE</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- Text 3: OF COMPLETION -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="5" name="Text 3"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="1691640"/>
            <a:ext cx="10360152" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr" indent="0" marL="0"><a:buNone/></a:pPr>
            <a:r>
              <a:rPr lang="en-US" sz="2000" spc="800" kern="0">
                <a:solidFill><a:srgbClr val="B8892B"/></a:solidFill>
                <a:latin typeface="Georgia" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>OF COMPLETION</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- Text 4: This is to certify that -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="6" name="Text 4"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="2514600"/>
            <a:ext cx="10360152" cy="365760"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr" indent="0" marL="0"><a:buNone/></a:pPr>
            <a:r>
              <a:rPr lang="en-US" sz="1600" i="1">
                <a:solidFill><a:srgbClr val="595959"/></a:solidFill>
                <a:latin typeface="Georgia" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>This is to certify that</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- Text 5: <<NAME>> Placeholder -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="7" name="Text 5"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="2926080"/>
            <a:ext cx="10360152" cy="822960"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr" indent="0" marL="0"><a:buNone/></a:pPr>
            <a:r>
              <a:rPr lang="en-US" sz="4000" b="1">
                <a:solidFill><a:srgbClr val="1F3864"/></a:solidFill>
                <a:latin typeface="Georgia" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>&lt;&lt;NAME&gt;&gt;</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- Text 6: has successfully completed the training course -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="8" name="Text 6"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="3840480"/>
            <a:ext cx="10360152" cy="365760"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr" indent="0" marL="0"><a:buNone/></a:pPr>
            <a:r>
              <a:rPr lang="en-US" sz="1600" i="1">
                <a:solidFill><a:srgbClr val="595959"/></a:solidFill>
                <a:latin typeface="Georgia" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>has successfully completed the training course</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- Text 7: <<COURSE_NAME>> Placeholder -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="9" name="Text 7"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1371600" y="4251960"/>
            <a:ext cx="9445752" cy="548640"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr" indent="0" marL="0"><a:buNone/></a:pPr>
            <a:r>
              <a:rPr lang="en-US" sz="2400" b="1">
                <a:solidFill><a:srgbClr val="1F3864"/></a:solidFill>
                <a:latin typeface="Georgia" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>${escapeXml(courseTitle || '<<COURSE_NAME>>')}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- Text 8: with a final score of <<PERCENTAGE>> -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="10" name="Text 8"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="4846320"/>
            <a:ext cx="10360152" cy="365760"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr" indent="0" marL="0"><a:buNone/></a:pPr>
            <a:r>
              <a:rPr lang="en-US" sz="1600" i="1">
                <a:solidFill><a:srgbClr val="595959"/></a:solidFill>
                <a:latin typeface="Georgia" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>with a final score of </a:t>
            </a:r>
            <a:r>
              <a:rPr lang="en-US" sz="1600" b="1">
                <a:solidFill><a:srgbClr val="1F3864"/></a:solidFill>
                <a:latin typeface="Georgia" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>&lt;&lt;PERCENTAGE&gt;&gt;</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- Shape 9: Date Underline -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="11" name="Shape 9"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1280160" y="5760720"/>
            <a:ext cx="2926080" cy="0"/>
          </a:xfrm>
          <a:prstGeom prst="line"><a:avLst/></a:prstGeom>
          <a:noFill/>
          <a:ln w="12700">
            <a:solidFill><a:srgbClr val="595959"/></a:solidFill>
            <a:prstDash val="solid"/>
          </a:ln>
        </p:spPr>
      </p:sp>

      <!-- Text 10: <<DATE>> -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="12" name="Text 10"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1280160" y="5349240"/>
            <a:ext cx="2926080" cy="365760"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr" indent="0" marL="0"><a:buNone/></a:pPr>
            <a:r>
              <a:rPr lang="en-US" sz="1600" b="1">
                <a:solidFill><a:srgbClr val="1F3864"/></a:solidFill>
                <a:latin typeface="Georgia" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>&lt;&lt;DATE&gt;&gt;</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- Text 11: Date of Issue -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="13" name="Text 11"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1280160" y="5806440"/>
            <a:ext cx="2926080" cy="274320"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr" indent="0" marL="0"><a:buNone/></a:pPr>
            <a:r>
              <a:rPr lang="en-US" sz="1200">
                <a:solidFill><a:srgbClr val="595959"/></a:solidFill>
                <a:latin typeface="Georgia" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>Date of Issue</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- Shape 12: Trainer Underline -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="14" name="Shape 12"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="7982712" y="5760720"/>
            <a:ext cx="2926080" cy="0"/>
          </a:xfrm>
          <a:prstGeom prst="line"><a:avLst/></a:prstGeom>
          <a:noFill/>
          <a:ln w="12700">
            <a:solidFill><a:srgbClr val="595959"/></a:solidFill>
            <a:prstDash val="solid"/>
          </a:ln>
        </p:spPr>
      </p:sp>

      <!-- Text 13: <<TRAINER_NAME>> -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="15" name="Text 13"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="7982712" y="5349240"/>
            <a:ext cx="2926080" cy="365760"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr" indent="0" marL="0"><a:buNone/></a:pPr>
            <a:r>
              <a:rPr lang="en-US" sz="1600" b="1">
                <a:solidFill><a:srgbClr val="1F3864"/></a:solidFill>
                <a:latin typeface="Georgia" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>&lt;&lt;TRAINER_NAME&gt;&gt;</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- Text 14: Lead Instructor -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="16" name="Text 14"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="7982712" y="5806440"/>
            <a:ext cx="2926080" cy="274320"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/><a:ln/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr" indent="0" marL="0"><a:buNone/></a:pPr>
            <a:r>
              <a:rPr lang="en-US" sz="1200">
                <a:solidFill><a:srgbClr val="595959"/></a:solidFill>
                <a:latin typeface="Georgia" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>Lead Instructor</a:t>
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
      <a:dk2><a:srgbClr val="1F3864"/></a:dk2>
      <a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
      <a:accent1><a:srgbClr val="B8892B"/></a:accent1>
      <a:accent2><a:srgbClr val="1F3864"/></a:accent2>
      <a:accent3><a:srgbClr val="595959"/></a:accent3>
      <a:accent4><a:srgbClr val="8B5CF6"/></a:accent4>
      <a:accent5><a:srgbClr val="F59E0B"/></a:accent5>
      <a:accent6><a:srgbClr val="EC4899"/></a:accent6>
      <a:hlink><a:srgbClr val="1F3864"/></a:hlink>
      <a:folHlink><a:srgbClr val="595959"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont><a:latin typeface="Georgia"/></a:majorFont>
      <a:minorFont><a:latin typeface="Georgia"/></a:minorFont>
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
