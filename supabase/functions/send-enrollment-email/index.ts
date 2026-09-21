// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, name, courseTitle, action, origin } = await req.json()

    if (!email || !name || !courseTitle || !action) {
      throw new Error('Missing required fields')
    }

    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD')

    if (!gmailUser || !gmailAppPassword) {
      console.warn('GMAIL_USER or GMAIL_APP_PASSWORD not set. Using simulated email flow.')
      return new Response(
        JSON.stringify({ message: 'Success', _simulated: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    })

    const isApproved = action === 'approve'
    const subject = isApproved 
      ? `Enrollment Approved: ${courseTitle}`
      : `Enrollment Update: ${courseTitle}`

    const headerText = isApproved ? 'Enrollment Approved!' : 'Enrollment Update'
    const headerColor = isApproved ? '#059669' : '#dc2626' // Emerald for approved, Red for rejected
    
    const bodyText = isApproved
      ? `Good news! Your request to enroll in <strong>${courseTitle}</strong> has been approved by the trainer. You can now access all course materials and begin learning.`
      : `We're sorry, but your request to enroll in <strong>${courseTitle}</strong> was not approved at this time. If you believe this is an error or have questions, please reach out to the course trainer or an administrator.`

    await transporter.sendMail({
      from: `"Capacity Connect" <${gmailUser}>`,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #f3f4f6;">
          
          <!-- Header Area -->
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Capacity Connect</h1>
            <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 15px; font-weight: 500;">Ministry of Earth Sciences</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 32px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <span style="display: inline-block; padding: 8px 16px; background-color: ${isApproved ? '#d1fae5' : '#fee2e2'}; color: ${isApproved ? '#065f46' : '#991b1b'}; border-radius: 9999px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                ${headerText}
              </span>
            </div>
            
            <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">Hello ${name},</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">${bodyText}</p>
            
            ${isApproved ? `
            <div style="text-align: center; margin-top: 40px;">
              <a href="${origin || 'https://capacityconnect.moes.gov.in'}/dashboard" style="background-color: #7c3aed; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.3);">
                Go to My Learning
              </a>
            </div>
            ` : `
            <div style="background-color: #f9fafb; border-left: 4px solid #9ca3af; padding: 16px; margin-top: 32px; border-radius: 0 8px 8px 0;">
              <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.5;">If you have any questions, please reply to this email or contact the support team directly.</p>
            </div>
            `}
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.5;">
              © ${new Date().getFullYear()} Capacity Connect. All rights reserved.<br>
              This is an automated message, please do not reply.
            </p>
          </div>
        </div>
      `,
    })

    return new Response(
      JSON.stringify({ message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Edge Function Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
