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
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaee; border-radius: 10px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #4c1d95; margin: 0;">Capacity Connect</h2>
              <p style="color: #6b7280; margin-top: 5px;">Ministry of Earth Sciences</p>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="color: #111827; margin-top: 0;">Verify Your Email Address</h3>
              <p style="color: #4b5563; font-size: 16px;">Please use the following 6-digit code to complete your registration:</p>
              
              <div style="background-color: #f3e8ff; border: 1px solid #d8b4fe; border-radius: 8px; padding: 15px; margin: 20px auto; width: fit-content;">
                <strong style="font-size: 32px; letter-spacing: 4px; color: #7e22ce;">${otp}</strong>
              </div>
              
              <p style="color: #9ca3af; font-size: 14px;">This code will expire in 10 minutes.</p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">If you didn't request this code, you can safely ignore this email.</p>
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
