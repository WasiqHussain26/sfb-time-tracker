'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import AuthGuard from '@/components/AuthGuard';

// --- ICONS ---
const Icons = {
  User: () => <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Mail: () => <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Settings: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  More: () => <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
};

function TeamPageContent() {
  const [users, setUsers] = useState<any[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: number; name: string; email: string; autoStopLimit?: number } | null>(null);
  
  const [editForm, setEditForm] = useState({ name: '', password: '', autoStopLimit: 5 });
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [globalLimit, setGlobalLimit] = useState<number>(5);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'EMPLOYEE', hourlyRate: 0 });

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (userStr) setCurrentUserRole(JSON.parse(userStr).role);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
      if (data.length > 0) setGlobalLimit(data[0].autoStopLimit || 5);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditForm({ name: user.name, password: '', autoStopLimit: user.autoStopLimit || 5 });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const token = localStorage.getItem('token');
    const toastId = toast.loading("Updating...");
    
    const payload: any = { name: editForm.name, autoStopLimit: editForm.autoStopLimit };
    if (editForm.password.trim() !== '') payload.password = editForm.password;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success("Updated!", { id: toastId });
        setIsEditOpen(false);
        fetchUsers();
      } else toast.error("Failed", { id: toastId });
    } catch { toast.error("Network Error", { id: toastId }); }
  };

  const handleGlobalSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const toastId = toast.loading("Saving policy...");
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/global-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ autoStopLimit: Number(globalLimit) })
    });
    toast.success("Policy Updated", { id: toastId });
    setIsGlobalSettingsOpen(false);
    fetchUsers();
  };

  const toggleUserStatus = async (userId: number, newStatus: string) => {
    if (!confirm(`Are you sure you want to ${newStatus === 'DISABLED' ? 'disable' : 'enable'} this user?`)) return;
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
    });
    fetchUsers();
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const toastId = toast.loading("Sending invite...");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
    });
    if (res.ok) {
        setIsInviteOpen(false);
        setFormData({ name: '', email: '', role: 'EMPLOYEE', hourlyRate: 0 });
        toast.success("Invite Sent!", { id: toastId });
        fetchUsers();
    } else {
        toast.error("Failed", { id: toastId });
    }
  };

  const displayedUsers = users.filter(u => activeTab === 'ACTIVE' ? u.status !== 'DISABLED' : u.status === 'DISABLED');
  const canManage = currentUserRole === 'EMPLOYER';

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-900">Team Members</h1>
           <p className="text-slate-500 mt-1">Manage access and settings for your workforce.</p>
        </div>
        
        {canManage && (
          <div className="flex items-center gap-3">
             <button onClick={() => setIsGlobalSettingsOpen(true)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium transition shadow-sm flex items-center gap-2">
                <Icons.Settings /> Policy Settings
             </button>
             <button onClick={() => setIsInviteOpen(true)} className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition">
                + Invite Member
             </button>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="flex items-center gap-1 mb-6 bg-slate-100/50 p-1 rounded-xl w-fit">
         {['ACTIVE', 'INACTIVE'].map((tab) => (
             <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === tab 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
             >
                {tab}
             </button>
         ))}
      </div>

      {/* GRID Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         <AnimatePresence>
             {displayedUsers.map((user, i) => (
                 <motion.div 
                    key={user.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
                 >
                    {/* Top Stripe */}
                    <div className={`absolute top-0 left-0 w-full h-1 ${user.role === 'ADMIN' ? 'bg-purple-500' : user.role === 'EMPLOYER' ? 'bg-slate-800' : 'bg-blue-500'}`} />

                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                             {/* Avatar */}
                             <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${
                                 user.role === 'ADMIN' ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 
                                 user.role === 'EMPLOYER' ? 'bg-gradient-to-br from-slate-700 to-slate-900' : 
                                 'bg-gradient-to-br from-blue-500 to-blue-700'
                             }`}>
                                 {user.name.charAt(0).toUpperCase()}
                             </div>
                             <div>
                                 <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{user.name}</h3>
                                 <div className="flex items-center gap-2 mt-0.5">
                                     <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                         user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 
                                         user.role === 'EMPLOYER' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 
                                         'bg-blue-50 text-blue-700 border border-blue-100'
                                     }`}>
                                         {user.role}
                                     </span>
                                     {user.status === 'INVITED' && <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 font-bold">Pending</span>}
                                 </div>
                             </div>
                        </div>

                        {canManage && user.role !== 'EMPLOYER' && (
                            <button onClick={() => openEditModal(user)} className="text-slate-300 hover:text-blue-600 transition-colors p-2 hover:bg-slate-50 rounded-lg">
                                <Icons.Edit />
                            </button>
                        )}
                    </div>

                    <div className="space-y-3 mt-4">
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                             <Icons.Mail /> <span className="truncate">{user.email}</span>
                        </div>
                        {user.autoStopLimit && (
                             <div className="flex items-center gap-3 text-sm text-slate-500">
                                 <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                 <span>{user.autoStopLimit}m auto-stop</span>
                             </div>
                        )}
                    </div>

                    {/* Actions Footer */}
                    {canManage && user.role !== 'EMPLOYER' && (
                        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end gap-2">
                             {user.status === 'DISABLED' ? (
                                 <button onClick={() => toggleUserStatus(user.id, 'ACTIVE')} className="text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors">
                                     Reactivate Account
                                 </button>
                             ) : (
                                 <button onClick={() => toggleUserStatus(user.id, 'DISABLED')} className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                     <Icons.Trash /> Deactivate
                                 </button>
                             )}
                        </div>
                    )}
                 </motion.div>
             ))}
         </AnimatePresence>
      </div>

      {displayedUsers.length === 0 && (
          <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Icons.User />
              </div>
              <h3 className="text-lg font-bold text-slate-400">No users found</h3>
          </div>
      )}

      {/* --- MODALS --- */}
      
      {/* 1. EDIT USER */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
               <div className="bg-blue-600 p-6">
                   <h3 className="text-white font-bold text-lg">Edit User Profile</h3>
                   <p className="text-blue-100 text-sm">{editingUser?.email}</p>
               </div>
               <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                   <div>
                       <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                       <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border p-2 rounded-lg mt-1 outline-none focus:border-blue-500" required />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-slate-500 uppercase">New Password (Optional)</label>
                       <input type="text" placeholder="••••••••" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full border p-2 rounded-lg mt-1 outline-none focus:border-blue-500" />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-slate-500 uppercase">Inactivity Timer (Mins)</label>
                       <input type="number" min="1" max="120" value={editForm.autoStopLimit} onChange={e => setEditForm({...editForm, autoStopLimit: Number(e.target.value)})} className="w-full border p-2 rounded-lg mt-1 outline-none focus:border-blue-500" required />
                   </div>
                   <div className="flex justify-end gap-2 pt-4">
                       <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg transition">Cancel</button>
                       <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition">Save Changes</button>
                   </div>
               </form>
           </motion.div>
        </div>
      )}

      {/* 2. GLOBAL SETTINGS */}
      {isGlobalSettingsOpen && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
               <div className="bg-slate-800 p-6 text-white">
                   <h3 className="font-bold text-lg flex items-center gap-2"><Icons.Settings /> Global Policy</h3>
                   <p className="text-slate-400 text-sm mt-1">Applies to all employees</p>
               </div>
               <form onSubmit={handleGlobalSettingsSubmit} className="p-6 space-y-4">
                   <div>
                       <label className="text-xs font-bold text-slate-500 uppercase">Default Inactivity Timer (Mins)</label>
                       <input type="number" min="1" max="120" value={globalLimit} onChange={e => setGlobalLimit(Number(e.target.value))} className="w-full border p-3 rounded-lg mt-1 outline-none focus:border-blue-500 text-lg font-bold text-center" required />
                   </div>
                   <div className="flex justify-end gap-2 pt-4">
                       <button type="button" onClick={() => setIsGlobalSettingsOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg transition">Cancel</button>
                       <button type="submit" className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-bold transition">Update Policy</button>
                   </div>
               </form>
            </motion.div>
         </div>
      )}

      {/* 3. INVITE MODAL */}
      {isInviteOpen && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
               <div className="bg-green-600 p-6 text-white">
                   <h3 className="font-bold text-lg">Invite New Member</h3>
                   <p className="text-green-100 text-sm">Send an invitation email</p>
               </div>
               <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
                   <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded-lg outline-none focus:border-green-500" required />
                   <input type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border p-2 rounded-lg outline-none focus:border-green-500" required />
                   <div className="grid grid-cols-2 gap-3">
                       <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="border p-2 rounded-lg outline-none focus:border-green-500">
                           <option value="EMPLOYEE">Employee</option>
                           <option value="ADMIN">Admin</option>
                           <option value="EMPLOYER">Employer</option>
                       </select>
                       <input type="number" placeholder="Rate ($)" value={formData.hourlyRate} onChange={e => setFormData({...formData, hourlyRate: Number(e.target.value)})} className="border p-2 rounded-lg outline-none focus:border-green-500" />
                   </div>
                   <div className="flex justify-end gap-2 pt-4">
                       <button type="button" onClick={() => setIsInviteOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg transition">Cancel</button>
                       <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition">Send Invite</button>
                   </div>
               </form>
            </motion.div>
         </div>
      )}

    </div>
  );
}

export default function TeamPage() {
  return (
    <AuthGuard allowedRoles={['EMPLOYER', 'ADMIN']}>
      <TeamPageContent />
    </AuthGuard>
  );
}