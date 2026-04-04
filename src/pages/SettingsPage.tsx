import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles } from '@/hooks/useProfile';
import { useAuditLog } from '@/hooks/useAuditLog';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, ROLE_LABELS, Profile } from '@/types';
import { getLanguage, setLanguage as saveLanguage } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, Globe, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
];

export default function SettingsPage() {
  const { hasRole } = useAuth();
  const { data: profiles = [] } = useProfiles();
  const { data: auditLog = [] } = useAuditLog();
  const qc = useQueryClient();
  const [language, setLang] = useState(getLanguage);
  const isManager = hasRole('stock_manager') || hasRole('admin');

  const handleRoleChange = async (profileId: string, newRole: AppRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId);
    if (error) { toast.error('Failed to update role'); return; }
    toast.success('Role updated');
    qc.invalidateQueries({ queryKey: ['profiles'] });
  };

  const handleLanguageChange = (lang: string) => {
    setLang(lang);
    saveLanguage(lang);
    toast.success('Language updated');
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
      </div>

      <Tabs defaultValue={isManager ? 'users' : 'general'} className="space-y-4">
        <TabsList>
          {isManager && <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> Users</TabsTrigger>}
          <TabsTrigger value="general" className="gap-2"><Globe className="h-4 w-4" /> Language</TabsTrigger>
          {isManager && <TabsTrigger value="audit" className="gap-2"><ScrollText className="h-4 w-4" /> Audit Log</TabsTrigger>}
        </TabsList>

        {isManager && (
          <TabsContent value="users" className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">User Management</h3>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm table-industrial">
                <thead>
                  <tr>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Role</th>
                    <th className="p-3 text-left">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => (
                    <tr key={p.id} className="border-t hover:bg-accent/50">
                      <td className="p-3 font-medium text-foreground">{p.display_name}</td>
                      <td className="p-3">
                        <Select value={p.role} onValueChange={v => handleRoleChange(p.id, v as AppRole)}>
                          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.entries(ROLE_LABELS) as [AppRole, string][]).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}

        <TabsContent value="general" className="space-y-4">
          <div className="bg-card rounded-lg border p-6 max-w-md">
            <h3 className="text-lg font-semibold text-foreground mb-4">Language / اللغة</h3>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-3">Interface language preference.</p>
          </div>
        </TabsContent>

        {isManager && (
          <TabsContent value="audit" className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Audit Log</h3>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm table-industrial">
                <thead>
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Action</th>
                    <th className="p-3 text-left">User</th>
                    <th className="p-3 text-left">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map(entry => (
                    <tr key={entry.id} className="border-t hover:bg-accent/50">
                      <td className="p-3 text-muted-foreground text-xs">{new Date(entry.created_at).toLocaleString()}</td>
                      <td className="p-3"><Badge variant="secondary">{entry.action}</Badge></td>
                      <td className="p-3 text-foreground text-xs">
                        {profiles.find(p => p.id === entry.user_id)?.display_name || entry.user_id?.slice(0, 8) || '—'}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground font-mono">
                        {entry.details ? JSON.stringify(entry.details).slice(0, 80) : '—'}
                      </td>
                    </tr>
                  ))}
                  {auditLog.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No audit entries</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
