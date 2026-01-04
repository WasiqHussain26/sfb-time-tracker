'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', status: 'ACTIVE', managerIds: [] as number[] });

  const fetchData = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (userStr) setUserRole(JSON.parse(userStr).role);

      const [resProj, resUsers] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects?search=${search}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const dataProj = await resProj.json();
      setProjects(Array.isArray(dataProj) ? dataProj : []);
      setUsers(await resUsers.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, [search]);

  const openModal = (project: any = null) => {
    setEditingProject(project);
    setFormData(project ? {
        name: project.name,
        status: project.status,
        managerIds: project.managers.map((m: any) => m.id),
    } : { name: '', status: 'ACTIVE', managerIds: [] });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const url = editingProject 
      ? `${process.env.NEXT_PUBLIC_API_URL}/projects/${editingProject.id}` 
      : `${process.env.NEXT_PUBLIC_API_URL}/projects`;
    
    await fetch(url, {
      method: editingProject ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData),
    });

    setIsModalOpen(false);
    fetchData();
  };

  const toggleManager = (userId: number) => {
    setFormData(prev => ({
       ...prev, 
       managerIds: prev.managerIds.includes(userId) 
        ? prev.managerIds.filter(id => id !== userId) 
        : [...prev.managerIds, userId]
    }));
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this project?')) return;
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchData();
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  const canEdit = userRole === 'EMPLOYER';

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
           <p className="text-slate-500 mt-1">Manage client projects and assignments</p>
        </div>
        {canEdit && (
          <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2">
            <span>+</span> Create Project
          </button>
        )}
      </div>

      {/* SEARCH */}
      <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="Search projects..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
            {projects.map((project, i) => (
                <motion.div 
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group relative overflow-hidden"
                >
                    <div className="flex justify-between items-start mb-4">
                        <Link href={`/dashboard/projects/${project.id}`} className="block">
                            <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                {project.managers?.length > 0 ? `Managed by ${project.managers[0].name}` : 'No Manager'} 
                                {project.managers?.length > 1 && ` +${project.managers.length - 1}`}
                            </p>
                        </Link>
                        <select 
                            value={project.status}
                            onChange={(e) => handleStatusChange(project.id, e.target.value)}
                            disabled={!canEdit}
                            className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider outline-none cursor-pointer border ${
                                project.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 
                                project.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                        >
                            <option value="ACTIVE">Active</option>
                            <option value="COMPLETED">Done</option>
                            <option value="CANCELLED">Void</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between text-sm text-slate-500 mt-6 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            <span>{project._count?.tasks || 0} Tasks</span>
                        </div>
                        {canEdit && (
                            <div className="flex gap-3">
                                <button onClick={() => openModal(project)} className="text-blue-600 hover:text-blue-800 font-semibold">Edit</button>
                                <button onClick={() => handleDelete(project.id)} className="text-red-400 hover:text-red-600 font-semibold">Delete</button>
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg">{editingProject ? 'Edit Project' : 'New Project'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Name</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assign Managers</label>
                        <div className="border rounded-lg max-h-40 overflow-y-auto p-2 bg-slate-50">
                            {users.map(u => (
                                <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                                    <input type="checkbox" checked={formData.managerIds.includes(u.id)} onChange={() => toggleManager(u.id)} className="rounded text-blue-600 focus:ring-0" />
                                    <span className="text-sm text-slate-700">{u.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Save</button>
                    </div>
                </form>
           </motion.div>
        </div>
      )}
    </div>
  );
}