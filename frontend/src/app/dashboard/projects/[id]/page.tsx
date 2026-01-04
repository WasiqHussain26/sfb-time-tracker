'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [project, setProject] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userRole, setUserRole] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', isOpenToAll: false, assigneeIds: [] as number[] });

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (userStr) setUserRole(JSON.parse(userStr).role);

    const [resProj, resUsers] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    
    setProject(await resProj.json());
    setUsers(await resUsers.json());
  };

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const openModal = (task: any = null) => {
    setEditingTask(task);
    setFormData(task ? {
        name: task.name,
        isOpenToAll: task.isOpenToAll,
        assigneeIds: task.assignees?.map((u: any) => u.id) || []
    } : { name: '', isOpenToAll: false, assigneeIds: [] });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const url = editingTask ? `${process.env.NEXT_PUBLIC_API_URL}/tasks/${editingTask.id}` : `${process.env.NEXT_PUBLIC_API_URL}/tasks`;
    
    await fetch(url, {
      method: editingTask ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...formData, projectId }),
    });

    setIsModalOpen(false);
    fetchData();
  };

  const toggleAssignee = (userId: number) => {
    setFormData(prev => ({
       ...prev, 
       assigneeIds: prev.assigneeIds.includes(userId) 
        ? prev.assigneeIds.filter(id => id !== userId) 
        : [...prev.assigneeIds, userId]
    }));
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm("Are you sure?")) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks/${taskId}`, { method: 'DELETE' });
    fetchData();
  };

  const canEdit = userRole === 'EMPLOYER';
  if (!project) return <div className="p-10 text-center text-slate-500">Loading details...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans">
      
      {/* HEADER CARD */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
         <div>
            <div className="flex items-center gap-3">
                 <h1 className="text-3xl font-bold text-slate-800">{project.name}</h1>
                 <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{project.status}</span>
            </div>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
                Managers: <span className="font-medium text-slate-700">{project.managers?.map((m: any) => m.name).join(', ') || 'None'}</span>
            </p>
         </div>
         {canEdit && (
             <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all">
                + Add Task
             </button>
         )}
      </div>

      {/* TASKS LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 font-bold text-slate-700 uppercase text-xs tracking-wider">
             Project Tasks ({project.tasks?.length || 0})
         </div>
         <div className="divide-y divide-slate-50">
             {project.tasks?.length === 0 ? (
                 <div className="p-8 text-center text-slate-400 italic">No tasks created yet.</div>
             ) : (
                 project.tasks?.map((task: any) => (
                     <div key={task.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row justify-between items-center gap-4">
                         <div className="flex-1">
                             <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                 {task.name}
                                 {task.isOpenToAll && <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-full uppercase border border-blue-100">Open to All</span>}
                             </h4>
                             <p className="text-sm text-slate-500 mt-1">
                                {task.isOpenToAll ? 'Available to all team members' : `Assigned to: ${task.assignees?.map((u: any) => u.name).join(', ')}`}
                             </p>
                         </div>

                         <div className="flex items-center gap-4">
                            <select 
                                value={task.status}
                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                disabled={!canEdit}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer border ${
                                    task.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 
                                    task.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'
                                }`}
                            >
                                <option value="ACTIVE">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Canelled</option>
                            </select>

                            {canEdit && (
                                <div className="flex gap-2">
                                    <button onClick={() => openModal(task)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button onClick={() => handleDelete(task.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            )}
                         </div>
                     </div>
                 ))
             )}
         </div>
      </div>

       {/* MODAL */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg">{editingTask ? 'Edit Task' : 'New Task'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Task Name</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                    </div>

                     <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={formData.isOpenToAll} onChange={e => setFormData({...formData, isOpenToAll: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-0" />
                        <span className="font-medium text-slate-700">Open to All Employees</span>
                     </label>

                    {!formData.isOpenToAll && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assign Employees</label>
                            <div className="border rounded-lg max-h-40 overflow-y-auto p-2 bg-slate-50">
                                {users.map(u => (
                                    <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                                        <input type="checkbox" checked={formData.assigneeIds.includes(u.id)} onChange={() => toggleAssignee(u.id)} className="rounded text-blue-600 focus:ring-0" />
                                        <span className="text-sm text-slate-700">{u.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

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