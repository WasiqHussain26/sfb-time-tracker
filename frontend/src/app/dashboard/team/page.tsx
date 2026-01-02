'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function TeamPage() {
  const [users, setUsers] = useState<any[]>([]);
  
  // Modals
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [globalLimit, setGlobalLimit] = useState<number>(5);

  // Invite Form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'EMPLOYEE',
    hourlyRate: 0
  });

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (userStr) setCurrentUserRole(JSON.parse(userStr).role);
      
      if (!token) return;

      const res = await fetch('http://localhost:3000/users', {
         headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401 || res.status === 403) {
         localStorage.clear();
         window.location.href = '/login';
         return;
      }

      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
      
      if (data.length > 0) {
        setGlobalLimit(data[0].autoStopLimit || 5);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchUsers(); }, []);

  // --- HANDLERS ---

  const handleGlobalSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const toastId = toast.loading("Updating company policy...");

    try {
        const res = await fetch('http://localhost:3000/users/global-settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ autoStopLimit: Number(globalLimit) })
        });

        if (res.ok) {
            toast.success("Updated for ALL users!", { id: toastId });
            setIsGlobalSettingsOpen(false);
            fetchUsers();
        } else {
            toast.error("Failed to update", { id: toastId });
        }
    } catch (err) { toast.error("Network Error", { id: toastId }); }
  };

  const toggleUserStatus = async (userId: number, newStatus: string) => {
    const action = newStatus === 'DISABLED' ? 'Deactivate' : 'Reactivate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    const token = localStorage.getItem('token');
    const toastId = toast.loading(`${action}ing user...`);

    try {
        const res = await fetch(`http://localhost:3000/users/${userId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) {
            toast.success(`User ${action}d!`, { id: toastId });
            fetchUsers();
        } else {
            toast.error("Failed", { id: toastId });
        }
    } catch (e) { toast.error("Error", { id: toastId }); }
  };
  
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const toastId = toast.loading("Sending invite...");
    try {
      const res = await fetch('http://localhost:3000/users/invite', {
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
    } catch (err) { toast.error("Network error.", { id: toastId }); }
  };

  const displayedUsers = users.filter(u => {
      if (activeTab === 'ACTIVE') return u.status === 'ACTIVE' || u.status === 'INVITED';
      return u.status === 'DISABLED';
  });

  const canManage = currentUserRole === 'EMPLOYER';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Team Management</h2>
        
        {canManage && (
          <div className="flex gap-2">
            <button onClick={() => setIsGlobalSettingsOpen(true)} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 font-medium text-sm flex items-center gap-2">
               ⚙️ Global Settings
            </button>
            <button onClick={() => setIsInviteOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium text-sm">
               + Invite User
            </button>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button onClick={() => setActiveTab('ACTIVE')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'ACTIVE' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
            ACTIVE ({users.filter(u => u.status !== 'DISABLED').length})
          </button>
          <button onClick={() => setActiveTab('INACTIVE')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'INACTIVE' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
            INACTIVE ({users.filter(u => u.status === 'DISABLED').length})
          </button>
        </nav>
      </div>

      <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Name</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">
                    <div>{user.name}</div>
                    <div className="text-xs text-gray-500 font-normal">{user.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-[10px] rounded-full font-bold uppercase ${
                    user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                    user.status === 'INVITED' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-gray-600 uppercase">
                    {user.role}
                </td>
                
                <td className="px-6 py-4 text-right">
                    {canManage && user.role !== 'EMPLOYER' && (
                        activeTab === 'ACTIVE' ? (
                            <button onClick={() => toggleUserStatus(user.id, 'DISABLED')} className="text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 hover:bg-red-50 px-3 py-1 rounded">
                                Deactivate
                            </button>
                        ) : (
                            <button onClick={() => toggleUserStatus(user.id, 'ACTIVE')} className="text-green-500 hover:text-green-700 text-xs font-bold border border-green-200 hover:bg-green-50 px-3 py-1 rounded">
                                Reactivate
                            </button>
                        )
                    )}
                </td>
              </tr>
            ))}
            {displayedUsers.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">No users found.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* --- GLOBAL SETTINGS MODAL --- */}
      {isGlobalSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[400px] shadow-2xl border border-gray-200">
            <h3 className="text-lg font-bold mb-1 text-gray-800">Global Policy</h3>
            <p className="text-xs text-gray-500 mb-4">This setting applies to ALL employees.</p>
            
            <form onSubmit={handleGlobalSettingsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Inactivity Auto-Stop (Minutes)</label>
                <input 
                    type="number" 
                    min="1" 
                    max="120"
                    required 
                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={globalLimit} 
                    onChange={(e) => setGlobalLimit(Number(e.target.value))} 
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsGlobalSettingsOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 text-sm font-medium">Update Policy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- INVITE MODAL --- */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[400px] shadow-2xl">
             <h3 className="text-xl font-bold mb-4 text-gray-800">Invite User</h3>
             <form onSubmit={handleInviteSubmit} className="space-y-4">
                <input type="text" placeholder="Full Name" required className="w-full border rounded px-3 py-2 text-sm"
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                <input type="email" placeholder="Email Address" required className="w-full border rounded px-3 py-2 text-sm"
                  value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                
                <div className="grid grid-cols-2 gap-4">
                  <select className="border rounded px-3 py-2 text-sm" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ADMIN">Admin</option>
                    {/* ADDED EMPLOYER OPTION */}
                    <option value="EMPLOYER">Employer</option> 
                  </select>
                  <input type="number" placeholder="Rate ($)" className="border rounded px-3 py-2 text-sm"
                    value={formData.hourlyRate} onChange={(e) => setFormData({...formData, hourlyRate: Number(e.target.value)})} />
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setIsInviteOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">Send</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}