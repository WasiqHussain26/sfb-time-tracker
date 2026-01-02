'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]); // List of all users for dropdown
  const [search, setSearch] = useState('');
  
  // User Role State
  const [userRole, setUserRole] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null); // If null, we are creating. If set, we are editing.

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    status: 'ACTIVE',
    managerIds: [] as number[],
  });

  // 1. Fetch Data (Projects & Users) & Check Role
  const fetchData = async () => {
    try {
      // Get User Role
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        setUserRole(u.role);
      }

      // Fetch Projects
      const resProjects = await fetch(`http://localhost:3000/projects?search=${search}`);
      const dataProjects = await resProjects.json();
      setProjects(Array.isArray(dataProjects) ? dataProjects : []);

      // Fetch Users (for the Manager select list)
      const resUsers = await fetch('http://localhost:3000/users');
      const dataUsers = await resUsers.json();
      setUsers(Array.isArray(dataUsers) ? dataUsers : []);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  // 2. Open Modal (Create vs Edit)
  const openModal = (project: any = null) => {
    if (project) {
      // Edit Mode
      setEditingProject(project);
      setFormData({
        name: project.name,
        status: project.status,
        managerIds: project.managers.map((m: any) => m.id),
      });
    } else {
      // Create Mode
      setEditingProject(null);
      setFormData({ name: '', status: 'ACTIVE', managerIds: [] });
    }
    setIsModalOpen(true);
  };

  // 3. Handle Form Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingProject 
      ? `http://localhost:3000/projects/${editingProject.id}` 
      : 'http://localhost:3000/projects';
    
    const method = editingProject ? 'PATCH' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    setIsModalOpen(false);
    fetchData(); // Refresh list
  };

  // 4. Handle Checkbox Change (For Managers)
  const toggleManager = (userId: number) => {
    setFormData(prev => {
      const exists = prev.managerIds.includes(userId);
      if (exists) {
        return { ...prev, managerIds: prev.managerIds.filter(id => id !== userId) };
      } else {
        return { ...prev, managerIds: [...prev.managerIds, userId] };
      }
    });
  };

  // 5. Direct Actions (Delete & Status Change)
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to DELETE this project? This cannot be undone.')) return;
    await fetch(`http://localhost:3000/projects/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    await fetch(`http://localhost:3000/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  // Permission Check
  const canEdit = userRole === 'EMPLOYER';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Projects Management</h2>
        
        {/* CREATE BUTTON (EMPLOYER ONLY) */}
        {canEdit && (
          <button 
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition flex items-center gap-2"
          >
            <span>+</span> Create Project
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
        <input 
          type="text"
          placeholder="Search projects..."
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-700">Project Name</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-700">Managers</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-700">Tasks</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-700">Status</th>
              {/* Only show Actions column if Employer */}
              {canEdit && <th className="px-6 py-4 text-sm font-semibold text-gray-700 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium text-gray-900">
                  <Link href={`/dashboard/projects/${project.id}`} className="text-blue-600 hover:underline hover:text-blue-800 cursor-pointer">
                    {project.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">
                  {project.managers?.map((m: any) => m.name).join(', ') || 'No Manager'}
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">{project._count?.tasks || 0}</td>
                
                {/* STATUS DROPDOWN ACTION */}
                <td className="px-6 py-4">
                  <select 
                    value={project.status}
                    onChange={(e) => handleStatusChange(project.id, e.target.value)}
                    disabled={!canEdit} // Disabled for Admin
                    className={`px-2 py-1 text-xs rounded border font-medium focus:outline-none ${
                      !canEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      project.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                      project.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </td>

                {/* EDIT & DELETE ACTIONS (EMPLOYER ONLY) */}
                {canEdit && (
                  <td className="px-6 py-4 text-right space-x-3">
                    <button 
                      onClick={() => openModal(project)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(project.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {projects.length === 0 && (
              <tr><td colSpan={canEdit ? 5 : 4} className="p-8 text-center text-gray-500">No projects found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[500px] shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              {/* Manager Selection (Checklist) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Project Managers</label>
                <div className="border border-gray-300 rounded max-h-40 overflow-y-auto p-2 bg-gray-50">
                  {users.length === 0 && <p className="text-xs text-gray-400">No users found.</p>}
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center gap-2 mb-1 p-1 hover:bg-white rounded">
                      <input 
                        type="checkbox"
                        id={`user-${user.id}`}
                        checked={formData.managerIds.includes(user.id)}
                        onChange={() => toggleManager(user.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor={`user-${user.id}`} className="text-sm text-gray-700 cursor-pointer select-none">
                        {user.name || user.email}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-6 border-t pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
                >
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}