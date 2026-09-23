// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from "npm:nodemailer"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { identifier, type } = await req.json()

    if (!identifier || !type) {
      throw new Error('Missing identifier or type')
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Call our database RPC to generate and store the OTP
    const { data: otp, error: rpcError } = await supabase
      .rpc('generate_otp', { p_identifier: identifier, p_type: type })

    if (rpcError || !otp) {
      throw new Error(`Failed to generate OTP: ${rpcError?.message}`)
    }

    if (type === 'email') {
      // Send Email via Google SMTP
      const gmailUser = Deno.env.get('GMAIL_USER')
      const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD')

      if (!gmailUser || !gmailAppPassword) {
        console.warn('GMAIL_USER or GMAIL_APP_PASSWORD not set. Using simulated email flow.')
        return new Response(
          JSON.stringify({ message: 'Success', _simulated: true, otp }),
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

      await transporter.sendMail({
        from: `"Capacity Connect" <${gmailUser}>`,
        to: identifier,
        subject: "Your Capacity Connect Verification Code",
        text: `Your Capacity Connect verification code is: ${otp}\nThis code will expire in 10 minutes.`,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
          'List-Unsubscribe': `<mailto:${gmailUser}?subject=unsubscribe>`
        },
        html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #f3f4f6;">
          
          <!-- Header Area -->
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Capacity Connect</h1>
            <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 15px; font-weight: 500;">Ministry of Earth Sciences</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 32px; text-align: center;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background-color: #f3e8ff; color: #7c3aed; margin-bottom: 24px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
            </div>
            
            <h2 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">Verify Your Email Address</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; max-width: 400px; margin-left: auto; margin-right: auto;">
              Please use the following 6-digit code to complete your verification request.
            </p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 0 auto 24px auto; max-width: 300px; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.02);">
              <strong style="font-size: 36px; letter-spacing: 0.25em; color: #4f46e5; font-family: monospace;">${otp}</strong>
            </div>
            
            <p style="color: #64748b; font-size: 14px; font-weight: 500;">
              ⏳ This code will expire in <span style="color: #4f46e5;">10 minutes</span>.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px 0; line-height: 1.5;">
              If you didn't request this code, you can safely ignore this email.
            </p>
            <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.5;">
              © ${new Date().getFullYear()} Capacity Connect. All rights reserved.
            </p>
          </div>
        </div>
        `,
      })
      
      return new Response(
        JSON.stringify({ message: 'Email sent successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } 
    
    if (type === 'mobile') {
      // Send SMS via Twilio API
      const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
      const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER')

      if (!twilioSid || !twilioAuthToken || !twilioPhone) {
        console.warn('Twilio credentials not set. Using simulated SMS flow.')
        return new Response(
          JSON.stringify({ message: 'Success', _simulated: true, otp }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
      
      const formData = new URLSearchParams()
      formData.append('To', identifier)
      formData.append('From', twilioPhone)
      formData.append('Body', `Your Capacity Connect verification code is: ${otp}`)

      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${twilioSid}:${twilioAuthToken}`)}`
        },
        body: formData.toString()
      })

      if (!twilioResponse.ok) {
        const errorData = await twilioResponse.json()
        throw new Error(`Twilio Error: ${errorData.message}`)
      }

      return new Response(
        JSON.stringify({ message: 'SMS sent successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid type specified')
  } catch (error: any) {
    console.error('Edge Function Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
