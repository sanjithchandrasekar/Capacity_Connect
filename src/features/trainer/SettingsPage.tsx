import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Bell, Shield, User } from 'lucide-react'
import { Link } from 'react-router-dom'

export function SettingsPage() {
  const { profile } = useAuth()

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-2xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your account settings</p>
        </motion.div>

        <motion.div variants={fadeUp} className="space-y-3.5">
          <Link to="/trainer/profile" className="block">
            <Card className="bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Account Profile</p>
                  <p className="text-xs text-slate-500 font-medium">{profile?.email} &middot; Role: <span className="capitalize font-semibold text-cyan-700">{profile?.role}</span></p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/trainer/notifications" className="block">
            <Card className="bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Notifications</p>
                  <p className="text-xs text-slate-500 font-medium">Configure notification preferences</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Security & Session</p>
                <p className="text-xs text-slate-500 font-medium">Manage password and session settings</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </TrainerLayout>
  )
}
