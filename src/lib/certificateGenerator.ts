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
 * Helper to safely load an image from URL or path
 */
async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/**
 * Generates an authentic, high-resolution government-grade PDF certificate of completion
 */
export async function generatePdfCertificate(data: CertificateData): Promise<Blob> {
  const width = 2970 // A4 landscape 300 DPI equivalent
  const height = 2100

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable')
  }

  // 1. Background Fill - Elegant off-white/ivory parchment with subtle warm tint
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  // Soft subtle gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height)
  bgGrad.addColorStop(0, '#FAFCFF')
  bgGrad.addColorStop(0.5, '#FFFFFF')
  bgGrad.addColorStop(1, '#F4F9FD')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // 2. Micro Guilloche Background Pattern / Watermark
  ctx.save()
  ctx.strokeStyle = 'rgba(14, 116, 144, 0.03)'
  ctx.lineWidth = 1
  for (let i = -width; i < width * 2; i += 60) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + height, height)
    ctx.stroke()
  }
  ctx.restore()

  // 3. Intricate Government Multi-layered Borders
  // Outer Royal Border
  ctx.strokeStyle = '#0F172A'
  ctx.lineWidth = 16
  ctx.strokeRect(60, 60, width - 120, height - 120)

  // Fine Gold Line 1
  ctx.strokeStyle = '#D97706'
  ctx.lineWidth = 4
  ctx.strokeRect(84, 84, width - 168, height - 168)

  // Thin Gold Line 2
  ctx.strokeStyle = '#F59E0B'
  ctx.lineWidth = 1.5
  ctx.strokeRect(96, 96, width - 192, height - 192)

  // Inner Subtle Cyan Border
  ctx.strokeStyle = '#0284C7'
  ctx.lineWidth = 2
  ctx.strokeRect(120, 120, width - 240, height - 240)

  // Corner Ornaments (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
  const drawCornerOrnament = (cx: number, cy: number, rot: number) => {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    ctx.strokeStyle = '#D97706'
    ctx.lineWidth = 3
    ctx.fillStyle = '#D97706'

    // Corner bracket
    ctx.beginPath()
    ctx.moveTo(-45, -45)
    ctx.lineTo(15, -45)
    ctx.lineTo(15, -35)
    ctx.lineTo(-35, -35)
    ctx.lineTo(-35, 15)
    ctx.lineTo(-45, 15)
    ctx.closePath()
    ctx.fill()

    // Corner diamond
    ctx.beginPath()
    ctx.arc(-20, -20, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  drawCornerOrnament(120, 120, 0)
  drawCornerOrnament(width - 120, 120, Math.PI / 2)
  drawCornerOrnament(width - 120, height - 120, Math.PI)
  drawCornerOrnament(120, height - 120, -Math.PI / 2)

  // 4. Header Logos (MoES, IMD, Capacity Connect)
  const [moesImg, imdImg, logoImg] = await Promise.all([
    loadImage('/MOES.jpg'),
    loadImage('/IMD.jpg'),
    loadImage('/logo.webp').then(img => img || loadImage('/logo.png')),
  ])

  // Left Logo: MoES
  if (moesImg) {
    ctx.save()
    const logoH = 120
    const logoW = (moesImg.width / moesImg.height) * logoH
    ctx.drawImage(moesImg, 180, 160, logoW, logoH)
    ctx.restore()
  }

  // Right Logo: IMD
  if (imdImg) {
    ctx.save()
    const logoH = 120
    const logoW = (imdImg.width / imdImg.height) * logoH
    ctx.drawImage(imdImg, width - 180 - logoW, 160, logoW, logoH)
    ctx.restore()
  }

  // Center Capacity Connect Emblem or Logo
  if (logoImg) {
    ctx.save()
    const logoH = 90
    const logoW = (logoImg.width / logoImg.height) * logoH
    ctx.drawImage(logoImg, width / 2 - logoW / 2, 155, logoW, logoH)
    ctx.restore()
  }

  // 5. Header Typography
  ctx.textAlign = 'center'
  
  // Government / Ministry Heading
  ctx.font = '700 36px "Cinzel", "Times New Roman", Georgia, serif'
  ctx.fillStyle = '#0F172A'
  ctx.fillText('GOVERNMENT OF INDIA • MINISTRY OF EARTH SCIENCES', width / 2, 290)

  ctx.font = '600 22px "Inter", "Arial", sans-serif'
  ctx.fillStyle = '#0369A1'
  ctx.letterSpacing = '3px'
  ctx.fillText('CAPACITY CONNECT LEARNING & KNOWLEDGE PLATFORM', width / 2, 330)

  // Decorative Horizontal Ribbon Divider
  ctx.save()
  const divY = 360
  const divGrad = ctx.createLinearGradient(width / 2 - 400, divY, width / 2 + 400, divY)
  divGrad.addColorStop(0, 'rgba(217, 119, 6, 0)')
  divGrad.addColorStop(0.3, 'rgba(217, 119, 6, 0.8)')
  divGrad.addColorStop(0.5, '#D97706')
  divGrad.addColorStop(0.7, 'rgba(217, 119, 6, 0.8)')
  divGrad.addColorStop(1, 'rgba(217, 119, 6, 0)')
  ctx.strokeStyle = divGrad
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(width / 2 - 450, divY)
  ctx.lineTo(width / 2 + 450, divY)
  ctx.stroke()

  // Center star
  ctx.fillStyle = '#D97706'
  ctx.font = '24px "Inter", sans-serif'
  ctx.fillText('★ ★ ★', width / 2, divY + 8)
  ctx.restore()

  // 6. Certificate Title
  ctx.font = '900 68px "Cinzel", "Times New Roman", Georgia, serif'
  ctx.fillStyle = '#0F172A'
  ctx.fillText('CERTIFICATE OF COMPLETION', width / 2, 470)

  // Subtitle
  ctx.font = 'italic 500 28px "Georgia", "Times New Roman", serif'
  ctx.fillStyle = '#64748B'
  ctx.fillText('This is proudly and officially awarded to', width / 2, 530)

  // 7. Trainee Full Name
  ctx.font = 'bold 76px "Georgia", "Times New Roman", serif'
  const nameGrad = ctx.createLinearGradient(width / 2 - 300, 600, width / 2 + 300, 650)
  nameGrad.addColorStop(0, '#0369A1')
  nameGrad.addColorStop(0.5, '#0284C7')
  nameGrad.addColorStop(1, '#0F172A')
  ctx.fillStyle = nameGrad
  ctx.fillText(data.traineeName || 'Trainee', width / 2, 640)

  // Name Underline with Gold Accent
  ctx.strokeStyle = '#D97706'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(width / 2 - 380, 670)
  ctx.lineTo(width / 2 + 380, 670)
  ctx.stroke()

  // 8. Description Text
  ctx.font = '400 28px "Inter", "Arial", sans-serif'
  ctx.fillStyle = '#475569'
  ctx.fillText('for successfully fulfilling all curriculum requirements and demonstrating professional competency in', width / 2, 735)

  // Course Title Box / Banner
  ctx.font = 'bold 44px "Cinzel", "Times New Roman", Georgia, serif'
  ctx.fillStyle = '#0F172A'
  
  // Measure course title & wrap if very long
  const rawCourseTitle = data.courseTitle || 'Specialized Training Program'
  ctx.fillText(rawCourseTitle, width / 2, 810)

  // Score & Achievement badge text
  const percentageStr = typeof data.percentage === 'number' 
    ? `${Math.round(data.percentage)}%` 
    : data.percentage || '100%'

  ctx.font = '500 26px "Inter", "Arial", sans-serif'
  ctx.fillStyle = '#334155'
  ctx.fillText(
    `Academic Assessment & Course Proficiency Score: `,
    width / 2 - 40,
    880
  )
  ctx.font = 'bold 28px "Inter", "Arial", sans-serif'
  ctx.fillStyle = '#059669'
  ctx.fillText(percentageStr, width / 2 + 310, 880)

  // Additional institutional accreditation note
  ctx.font = 'italic 20px "Georgia", "Times New Roman", serif'
  ctx.fillStyle = '#64748B'
  ctx.fillText(
    'Conducted under the National Earth Science Capacity Building Framework • Smart India Hackathon Initiative SIH26075',
    width / 2,
    930
  )

  // 9. Official Embossed Gold Seal (Lower Center / Left)
  const sealX = width / 2
  const sealY = 1140
  const sealRadius = 90

  ctx.save()
  // Seal Outer Starburst / Rosette
  ctx.fillStyle = '#D97706'
  for (let i = 0; i < 36; i++) {
    ctx.save()
    ctx.translate(sealX, sealY)
    ctx.rotate((i * 10 * Math.PI) / 180)
    ctx.beginPath()
    ctx.moveTo(0, -sealRadius - 12)
    ctx.lineTo(8, -sealRadius + 2)
    ctx.lineTo(-8, -sealRadius + 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // Outer Gold Circle
  ctx.beginPath()
  ctx.arc(sealX, sealY, sealRadius, 0, Math.PI * 2)
  const sealGrad = ctx.createRadialGradient(sealX - 20, sealY - 20, 10, sealX, sealY, sealRadius)
  sealGrad.addColorStop(0, '#FDE68A')
  sealGrad.addColorStop(0.5, '#F59E0B')
  sealGrad.addColorStop(1, '#B45309')
  ctx.fillStyle = sealGrad
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = '#78350F'
  ctx.stroke()

  // Inner Circle
  ctx.beginPath()
  ctx.arc(sealX, sealY, sealRadius - 14, 0, Math.PI * 2)
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2
  ctx.setLineDash([4, 4])
  ctx.stroke()
  ctx.setLineDash([])

  // Seal Text
  ctx.font = 'bold 15px "Inter", "Arial", sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'center'
  ctx.fillText('★ OFFICIAL SEAL ★', sealX, sealY - 30)
  ctx.font = 'bold 20px "Cinzel", "Times New Roman", serif'
  ctx.fillText('GOVT OF INDIA', sealX, sealY - 2)
  ctx.font = 'bold 14px "Inter", "Arial", sans-serif'
  ctx.fillText('MOES CERTIFIED', sealX, sealY + 26)
  ctx.font = 'bold 11px "Inter", "Arial", sans-serif'
  ctx.fillText('VERIFIED CREDENTIAL', sealX, sealY + 45)

  // Ribbon tails below seal
  ctx.fillStyle = '#B45309'
  ctx.beginPath()
  ctx.moveTo(sealX - 35, sealY + sealRadius - 10)
  ctx.lineTo(sealX - 65, sealY + sealRadius + 55)
  ctx.lineTo(sealX - 35, sealY + sealRadius + 40)
  ctx.lineTo(sealX - 10, sealY + sealRadius + 55)
  ctx.lineTo(sealX - 10, sealY + sealRadius - 5)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#D97706'
  ctx.beginPath()
  ctx.moveTo(sealX + 10, sealY + sealRadius - 5)
  ctx.lineTo(sealX + 10, sealY + sealRadius + 55)
  ctx.lineTo(sealX + 35, sealY + sealRadius + 40)
  ctx.lineTo(sealX + 65, sealY + sealRadius + 55)
  ctx.lineTo(sealX + 35, sealY + sealRadius - 10)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // 10. Left Signature Block: Lead Trainer / Instructor
  const sigLeftX = 540
  const sigY = 1180

  // Stylized signature curve for trainer
  ctx.save()
  ctx.strokeStyle = '#0284C7'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(sigLeftX - 140, sigY - 25)
  ctx.bezierCurveTo(sigLeftX - 90, sigY - 70, sigLeftX - 50, sigY + 10, sigLeftX, sigY - 35)
  ctx.bezierCurveTo(sigLeftX + 40, sigY - 75, sigLeftX + 80, sigY - 10, sigLeftX + 130, sigY - 30)
  ctx.stroke()
  ctx.restore()

  ctx.strokeStyle = '#64748B'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(sigLeftX - 180, sigY)
  ctx.lineTo(sigLeftX + 180, sigY)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.font = 'bold 24px "Inter", "Arial", sans-serif'
  ctx.fillStyle = '#0F172A'
  ctx.fillText(data.trainerName || 'Lead Course Instructor', sigLeftX, sigY + 35)

  ctx.font = '500 18px "Inter", "Arial", sans-serif'
  ctx.fillStyle = '#64748B'
  ctx.fillText('Lead Trainer & Subject Expert', sigLeftX, sigY + 65)
  ctx.fillText('Ministry of Earth Sciences, GoI', sigLeftX, sigY + 90)

  // 11. Right Signature Block: Competent Authority / Director MoES
  const sigRightX = width - 540

  // Stylized signature curve for authority
  ctx.save()
  ctx.strokeStyle = '#0369A1'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(sigRightX - 130, sigY - 20)
  ctx.bezierCurveTo(sigRightX - 80, sigY - 65, sigRightX - 30, sigY + 15, sigRightX + 20, sigY - 40)
  ctx.bezierCurveTo(sigRightX + 60, sigY - 80, sigRightX + 100, sigY - 5, sigRightX + 140, sigY - 25)
  ctx.stroke()
  ctx.restore()

  ctx.strokeStyle = '#64748B'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(sigRightX - 180, sigY)
  ctx.lineTo(sigRightX + 180, sigY)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.font = 'bold 24px "Inter", "Arial", sans-serif'
  ctx.fillStyle = '#0F172A'
  ctx.fillText('Director General / Program Chair', sigRightX, sigY + 35)

  ctx.font = '500 18px "Inter", "Arial", sans-serif'
  ctx.fillStyle = '#64748B'
  ctx.fillText('Capacity Building & Human Resource Division', sigRightX, sigY + 65)
  ctx.fillText('India Meteorological Department / MoES', sigRightX, sigY + 90)

  // 12. Bottom Security & Verification Metadata Bar
  const formattedDate = data.completedAt 
    ? new Date(data.completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const certId = data.certificateId || `CC-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

  ctx.fillStyle = '#0F172A'
  ctx.fillRect(120, height - 190, width - 240, 50)

  ctx.textAlign = 'left'
  ctx.font = '600 18px "Inter", "Arial", sans-serif'
  ctx.fillStyle = '#38BDF8'
  ctx.fillText(`  ISSUE DATE: ${formattedDate.toUpperCase()}`, 140, height - 158)

  ctx.textAlign = 'center'
  ctx.font = '600 18px "Inter", "Arial", sans-serif'
  ctx.fillStyle = '#FDE68A'
  ctx.fillText(`CERTIFICATE ID: ${certId}`, width / 2, height - 158)

  ctx.textAlign = 'right'
  ctx.font = '600 18px "Inter", "Arial", sans-serif'
  ctx.fillStyle = '#34D399'
  ctx.fillText(`STATUS: VERIFIED & AUTHENTICATED  `, width - 140, height - 158)

  ctx.textAlign = 'center'
  ctx.font = '500 15px "Inter", "Arial", sans-serif'
  ctx.fillStyle = '#64748B'
  ctx.fillText(
    'Verify authenticity online at https://capacity-connect.gov.in/verify  •  Issued by Ministry of Earth Sciences, New Delhi',
    width / 2,
    height - 105
  )

  // Convert canvas to High Quality PNG image data URL
  const imgDataUrl = canvas.toDataURL('image/png', 1.0)

  // Create jsPDF instance in A4 Landscape (297mm x 210mm)
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  // Add the high-res certificate image to fill standard A4 Landscape page precisely
  pdf.addImage(imgDataUrl, 'PNG', 0, 0, 297, 210, undefined, 'FAST')

  // Return PDF Blob
  return pdf.output('blob')
}

/**
 * Generates a customized PDF certificate and saves it to Supabase storage
 */
export async function generateTraineeCertificate(
  _templateUrl: string | null | undefined,
  data: CertificateData
): Promise<{ blob: Blob; fileName: string; storageUrl?: string }> {
  // Generate high-resolution PDF certificate
  const outputBlob = await generatePdfCertificate(data)

  const safeTraineeName = (data.traineeName || 'Trainee').replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeCourseName = (data.courseTitle || 'Course').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)
  const fileName = `${safeTraineeName}_${safeCourseName}_Certificate.pdf`

  // Upload certificate to 'certificates' bucket as PDF
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
