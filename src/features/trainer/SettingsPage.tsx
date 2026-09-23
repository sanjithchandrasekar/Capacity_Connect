import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Settings, Bell, Shield, User } from 'lucide-react'

export function SettingsPage() {
  const { profile } = useAuth()

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-2xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-200">Settings</h2>
          <p className="text-zinc-200/60 text-sm mt-1">Manage your account settings</p>
        </motion.div>

        <motion.div variants={fadeUp} className="space-y-4">
          <Card className="bg-[#070E20]/90 border-cyan-500/30">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-ink/10 flex items-center justify-center"><User className="w-5 h-5 text-zinc-200" /></div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Account</p>
                <p className="text-xs text-zinc-200/50">{profile?.email} &middot; {profile?.role}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#070E20]/90 border-cyan-500/30">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-ink/10 flex items-center justify-center"><Bell className="w-5 h-5 text-zinc-200" /></div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Notifications</p>
                <p className="text-xs text-zinc-200/50">Configure notification preferences</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#070E20]/90 border-cyan-500/30">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-ink/10 flex items-center justify-center"><Shield className="w-5 h-5 text-zinc-200" /></div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Security</p>
                <p className="text-xs text-zinc-200/50">Manage password and session settings</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </TrainerLayout>
  )
}
