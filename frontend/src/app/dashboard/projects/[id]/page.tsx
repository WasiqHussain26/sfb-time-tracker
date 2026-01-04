'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [project, setProject] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userRole, setUserRole] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null); // Null = Create Mode, Object = Edit Mode

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    isOpenToAll: false,
    assigneeIds: [] as number[]
  });

  // 1. Fetch Data & Check Role
  const fetchData = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (userStr) {
        const u = JSON.parse(userStr);
        setUserRole(u.role);
      }

      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const resProject = await fetch(`https://sfb-backend.vercel.app/projects/${projectId}`, { headers });
      const dataProject = await resProject.json();
      setProject(dataProject);

      const resUsers = await fetch('https://sfb-backend.vercel.app/users', { headers });
      const dataUsers = await resUsers.json();
      setUsers(Array.isArray(dataUsers) ? dataUsers : []);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  // 2. Open Modal (Create vs Edit Logic)
  const openModal = (task: any = null) => {
    if (task) {
      // EDIT MODE
      setEditingTask(task);
      setFormData({
        name: task.name,
        isOpenToAll: task.isOpenToAll,
        assigneeIds: task.assignees?.map((u: any) => u.id) || []
      });
    } else {
      // CREATE MODE
      setEditingTask(null);
      setFormData({
        name: '',
        isOpenToAll: false,
        assigneeIds: []
      });
    }
    setIsModalOpen(true);
  };

  // 3. Handle Submit (Create OR Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTask
        ? `https://sfb-backend.vercel.app/tasks/${editingTask.id}` // Patch URL
        : 'https://sfb-backend.vercel.app/tasks';                  // Post URL

      const method = editingTask ? 'PATCH' : 'POST';

      const body = {
        ...formData,
        projectId: projectId, // Ensure projectId is sent
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData(); // Refresh list
      }
    } catch (err) {
      console.error('Failed to save task', err);
    }
  };

  // 4. Helper: Toggle Checkbox for Assignees
  const toggleAssignee = (userId: number) => {
    setFormData(prev => {
      const exists = prev.assigneeIds.includes(userId);
      if (exists) {
        return { ...prev, assigneeIds: prev.assigneeIds.filter(id => id !== userId) };
      } else {
        return { ...prev, assigneeIds: [...prev.assigneeIds, userId] };
      }
    });
  };

  // 5. Direct Action: Change Status
  const handleStatusChange = async (taskId: number, newStatus: string) => {
    await fetch(`https://sfb-backend.vercel.app/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  // 6. Direct Action: Delete Task
  const handleDelete = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    await fetch(`https://sfb-backend.vercel.app/tasks/${taskId}`, { method: 'DELETE' });
    fetchData();
  };

  // Permission Check
  const canEdit = userRole === 'EMPLOYER';

  if (!project) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-gray-500 mt-1">
            Managed by: {project.managers?.map((m: any) => m.name).join(', ') || 'None'}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}>
          {project.status}
        </span>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-700">Tasks</h3>

          {/* ADD TASK BUTTON (EMPLOYER ONLY) */}
          {canEdit && (
            <button
              onClick={() => openModal(null)} // Pass null for Create Mode
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              + Add Task
            </button>
          )}
        </div>

        {project.tasks && project.tasks.length > 0 ? (
          <ul className="space-y-3">
            {project.tasks.map((task: any) => (
              <li key={task.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition flex justify-between items-center">

                {/* Left Side: Name & Assignees */}
                <div>
                  <p className="font-semibold text-gray-800 text-lg">{task.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {task.isOpenToAll ? (
                      <span className="text-green-600 font-medium">🌍 Open to All</span>
                    ) : (
                      <span>👥 Assigned to: {task.assignees?.map((u: any) => u.name).join(', ') || 'No one'}</span>
                    )}
                  </p>
                </div>

                {/* Right Side: Actions (Status, Edit, Delete) */}
                <div className="flex items-center gap-3">
                  {/* Status Dropdown */}
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    disabled={!canEdit}
                    className={`px-2 py-1 text-xs rounded border font-medium focus:outline-none ${!canEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                      } ${task.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                        task.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-red-50 text-red-700 border-red-200'
                      }`}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>

                  {/* EDIT & DELETE (EMPLOYER ONLY) */}
                  {canEdit && (
                    <>
                      <button
                        onClick={() => openModal(task)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium px-2"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded border border-dashed border-gray-300">
            <p className="text-gray-500">No tasks created yet.</p>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[500px] shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {editingTask ? 'Edit Task' : 'Add New Task'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Task Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Frontend Development"
                />
              </div>

              {/* Open to All Toggle */}
              <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border">
                <input
                  type="checkbox"
                  id="openToAll"
                  checked={formData.isOpenToAll}
                  onChange={(e) => setFormData({ ...formData, isOpenToAll: e.target.checked })}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
                <label htmlFor="openToAll" className="text-sm text-gray-700 cursor-pointer select-none font-medium">
                  Open to All Employees
                </label>
              </div>

              {/* Assignees List (Hidden if Open to All) */}
              {!formData.isOpenToAll && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign Employees</label>
                  <div className="border rounded max-h-40 overflow-y-auto p-2 bg-white">
                    {users.length === 0 && <p className="text-xs text-gray-400 p-2">No users found.</p>}
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center gap-2 mb-1 p-1 hover:bg-gray-50 rounded transition">
                        <input
                          type="checkbox"
                          id={`u-${user.id}`}
                          checked={formData.assigneeIds.includes(user.id)}
                          onChange={() => toggleAssignee(user.id)}
                          className="w-4 h-4 text-blue-600 cursor-pointer"
                        />
                        <label htmlFor={`u-${user.id}`} className="text-sm text-gray-700 cursor-pointer select-none w-full">
                          {user.name || user.email}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}