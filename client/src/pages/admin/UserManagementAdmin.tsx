import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Building2,
  KeyRound,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  ShieldAlert,
  Phone,
  Mail,
  Briefcase,
  Building
} from 'lucide-react';
import { api } from '../../api/client';
import { Modal } from '../../components/common/Modal';

export const UserManagementAdmin: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total_users: 0,
    active_users: 0,
    disabled_users: 0,
    total_employees: 0,
    total_suppliers: 0
  });
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'EMPLOYEE' | 'SUPPLIER' | 'DISABLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Form States - Create / Edit
  const [userTypeForm, setUserTypeForm] = useState<'EMPLOYEE' | 'SUPPLIER'>('EMPLOYEE');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [roleId, setRoleId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Form State - Password Reset
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMetadata();
    loadUsers();
  }, [activeTab, selectedRole]);

  const loadMetadata = async () => {
    try {
      const [rList, dList, sList] = await Promise.all([
        api.getRoles(),
        api.getDepartments(),
        api.getSuppliers()
      ]);
      setRoles(rList || []);
      setDepartments(dList || []);
      setSuppliers(sList || []);
    } catch (err) {
      console.error('Failed to load master metadata:', err);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (activeTab === 'EMPLOYEE') params.userType = 'EMPLOYEE';
      else if (activeTab === 'SUPPLIER') params.userType = 'SUPPLIER';
      else if (activeTab === 'DISABLED') params.status = '0';

      if (selectedRole) params.roleId = selectedRole;
      if (searchQuery) params.search = searchQuery;

      const res = await api.getUsers(params);
      setUsers(res.users || []);
      if (res.stats) setStats(res.stats);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setJobTitle('');
    setInitialPassword('Password123!');
    setIsActive(true);
    setUserTypeForm('EMPLOYEE');

    const defaultRole = roles.find((r) => r.name === 'Procurement Officer') || roles[0];
    setRoleId(defaultRole ? defaultRole.id : '');
    setDepartmentId(departments[0]?.id || '');
    setSupplierId(suppliers[0]?.id || '');

    setShowCreateModal(true);
  };

  // Submit Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !initialPassword || !firstName || !lastName || !roleId) {
      alert('Please fill all mandatory fields (Name, Email, Password, Role).');
      return;
    }
    setSubmitting(true);
    try {
      await api.createUser({
        firstName,
        lastName,
        email,
        phone,
        jobTitle,
        password: initialPassword,
        roleId,
        departmentId: userTypeForm === 'EMPLOYEE' ? departmentId : null,
        supplierId: userTypeForm === 'SUPPLIER' ? supplierId : null,
        isActive
      });
      alert(`User account for ${firstName} ${lastName} created successfully!`);
      setShowCreateModal(false);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (u: any) => {
    setSelectedUser(u);
    setFirstName(u.first_name || '');
    setLastName(u.last_name || '');
    setEmail(u.email || '');
    setPhone(u.phone || '');
    setJobTitle(u.job_title || '');
    setRoleId(u.role_id || '');
    setDepartmentId(u.department_id || '');
    setSupplierId(u.supplier_id || '');
    setIsActive(u.is_active === 1);
    setUserTypeForm(u.supplier_id || u.role_name === 'Supplier' ? 'SUPPLIER' : 'EMPLOYEE');
    setShowEditModal(true);
  };

  // Submit Edit User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await api.updateUser(selectedUser.id, {
        firstName,
        lastName,
        email,
        phone,
        jobTitle,
        roleId,
        departmentId: userTypeForm === 'EMPLOYEE' ? departmentId : null,
        supplierId: userTypeForm === 'SUPPLIER' ? supplierId : null,
        isActive
      });
      alert('User details updated successfully!');
      setShowEditModal(false);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Password Modal
  const handleOpenPassword = (u: any) => {
    setSelectedUser(u);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  // Submit Password Change
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match. Please re-type.');
      return;
    }

    setSubmitting(true);
    try {
      await api.changeUserPassword(selectedUser.id, { newPassword });
      alert(`Password updated successfully for ${selectedUser.first_name} ${selectedUser.last_name}!`);
      setShowPasswordModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle User Status
  const handleToggleStatus = async (u: any) => {
    const nextStatus = u.is_active === 1 ? false : true;
    const confirmMsg = nextStatus
      ? `Are you sure you want to ENABLE login access for ${u.first_name} ${u.last_name}?`
      : `Are you sure you want to DISABLE login access for ${u.first_name} ${u.last_name}? The user will not be able to log in.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.toggleUserStatus(u.id, { isActive: nextStatus });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to change user status');
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await api.deleteUser(selectedUser.id);
      alert(`User ${selectedUser.first_name} ${selectedUser.last_name} deleted.`);
      setShowDeleteModal(false);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to generate strong password
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    setInitialPassword(pwd);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white tracking-tight">User & Access Master</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Super Admin Only
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Central identity governance: Manage all internal enterprise employees and external supplier credentials, reset passwords, and toggle login access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadUsers}
            className="p-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New User / Staff</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Accounts</span>
          <p className="text-2xl font-black text-white font-mono mt-1">{stats.total_users || 0}</p>
          <span className="text-[10px] text-slate-500">Identity Master Records</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Internal Employees</span>
          <p className="text-2xl font-black text-blue-400 font-mono mt-1">{stats.total_employees || 0}</p>
          <span className="text-[10px] text-blue-500/80">Corporate Staff</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Supplier Users</span>
          <p className="text-2xl font-black text-amber-400 font-mono mt-1">{stats.total_suppliers || 0}</p>
          <span className="text-[10px] text-amber-500/80">External Vendor Contacts</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Logins</span>
          <p className="text-2xl font-black text-emerald-400 font-mono mt-1">{stats.active_users || 0}</p>
          <span className="text-[10px] text-emerald-500/80">Login Enabled</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Disabled Accounts</span>
          <p className="text-2xl font-black text-rose-400 font-mono mt-1">{stats.disabled_users || 0}</p>
          <span className="text-[10px] text-rose-500/80">Access Revoked</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="rounded-3xl bg-slate-850 border border-slate-800 p-4 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tab Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Users ({stats.total_users || 0})
            </button>
            <button
              onClick={() => setActiveTab('EMPLOYEE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'EMPLOYEE' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Internal Staff ({stats.total_employees || 0})
            </button>
            <button
              onClick={() => setActiveTab('SUPPLIER')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'SUPPLIER' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Supplier Users ({stats.total_suppliers || 0})
            </button>
            <button
              onClick={() => setActiveTab('DISABLED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'DISABLED' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Disabled ({stats.disabled_users || 0})
            </button>
          </div>

          {/* Search and Role Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white outline-none focus:border-blue-500"
            >
              <option value="">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, email, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </form>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-slate-400">Loading user accounts...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No user accounts found</p>
              <p className="text-xs text-slate-500">Try modifying your search or filter criteria.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">User Details</th>
                  <th className="px-5 py-3.5">System Role</th>
                  <th className="px-5 py-3.5">Affiliation / Organization</th>
                  <th className="px-5 py-3.5">Contact Phone</th>
                  <th className="px-5 py-3.5">Login Status</th>
                  <th className="px-5 py-3.5">Last Login</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => {
                  const isSupplierUser = Boolean(u.supplier_id || u.role_name === 'Supplier');
                  const isUserActive = u.is_active === 1;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* User Info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isSupplierUser
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {u.first_name?.[0] || 'U'}
                            {u.last_name?.[0] || ''}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">
                              {u.first_name} {u.last_name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" /> {u.email}
                            </p>
                            {u.job_title && (
                              <p className="text-[10px] text-slate-500">{u.job_title}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* System Role */}
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-flex items-center gap-1 ${
                            u.role_name === 'Super Administrator'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : isSupplierUser
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {u.role_name}
                        </span>
                      </td>

                      {/* Affiliation */}
                      <td className="px-5 py-4">
                        {isSupplierUser ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                            <div>
                              <p className="font-bold text-white text-xs">{u.supplier_name || 'External Supplier'}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{u.supplier_code || 'Vendor Contact'}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-blue-400 shrink-0" />
                            <div>
                              <p className="font-bold text-slate-200 text-xs">{u.department_name || 'Corporate HQ'}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{u.department_code || 'INTERNAL'}</p>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4 font-mono text-slate-300">
                        {u.phone || '—'}
                      </td>

                      {/* Status & Quick Toggle */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          title={`Click to ${isUserActive ? 'Disable' : 'Enable'} Login`}
                          className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all ${
                            isUserActive
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400'
                          }`}
                        >
                          {isUserActive ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Disabled</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Last Login */}
                      <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
                        {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Change Password */}
                          <button
                            onClick={() => handleOpenPassword(u)}
                            title="Reset / Change Password"
                            className="p-2 rounded-xl bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-400 border border-slate-700 transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Edit User Profile"
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setShowDeleteModal(true);
                            }}
                            title="Delete User"
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400 border border-slate-700 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL 1: CREATE NEW USER */}
      {showCreateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          title="Create New User Account"
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            {/* User Type Switcher */}
            <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setUserTypeForm('EMPLOYEE')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  userTypeForm === 'EMPLOYEE' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Internal Employee / Staff
              </button>
              <button
                type="button"
                onClick={() => setUserTypeForm('SUPPLIER')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  userTypeForm === 'SUPPLIER' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                External Supplier User
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. John"
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Doe"
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Email Address (Login ID) *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@company.com"
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Contact Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Assigned Role *</label>
                <select
                  required
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Job Title / Designation</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Buyer"
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                />
              </div>
            </div>

            {/* Conditional Affiliation */}
            {userTypeForm === 'EMPLOYEE' ? (
              <div>
                <label className="text-xs font-semibold text-slate-400">Internal Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                >
                  <option value="">-- No Department Assigned --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-slate-400">Supplier Organization *</label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                >
                  <option value="">-- Select Supplier Organization --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.supplier_code} — {s.legal_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Password Section */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400">Initial Password *</label>
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
                >
                  ⚡ Generate Strong Password
                </button>
              </div>
              <div className="relative mt-1">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  className="w-full px-3.5 py-2 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPasswordText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActiveCreate"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 accent-blue-600 cursor-pointer"
              />
              <label htmlFor="isActiveCreate" className="text-xs font-semibold text-slate-300 cursor-pointer">
                Enable login access immediately
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all"
              >
                {submitting ? 'Creating User...' : 'Create User Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: EDIT USER DETAILS */}
      {showEditModal && selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setShowEditModal(false)}
          title={`Edit User: ${selectedUser.first_name} ${selectedUser.last_name}`}
        >
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Assigned Role *</label>
                <select
                  required
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Job Title / Designation</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                />
              </div>
            </div>

            {userTypeForm === 'EMPLOYEE' ? (
              <div>
                <label className="text-xs font-semibold text-slate-400">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                >
                  <option value="">-- None --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-slate-400">Supplier Organization</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-blue-500"
                >
                  <option value="">-- None --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.supplier_code} — {s.legal_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActiveEdit"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 accent-blue-600 cursor-pointer"
              />
              <label htmlFor="isActiveEdit" className="text-xs font-semibold text-slate-300 cursor-pointer">
                Account Active (Can log in)
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30"
              >
                {submitting ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: ADMIN PASSWORD RESET */}
      {showPasswordModal && selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setShowPasswordModal(false)}
          title={`Reset Password for ${selectedUser.first_name} ${selectedUser.last_name}`}
        >
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 text-xs space-y-1">
              <p className="text-slate-400">Account: <strong className="text-white">{selectedUser.first_name} {selectedUser.last_name}</strong></p>
              <p className="text-slate-400">Login ID: <strong className="text-blue-400 font-mono">{selectedUser.email}</strong></p>
              <p className="text-slate-400">Role: <strong className="text-slate-200">{selectedUser.role_name}</strong></p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400">New Password (Min 6 chars) *</label>
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
                >
                  ⚡ Generate Strong Password
                </button>
              </div>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password..."
                className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Confirm New Password *</label>
              <input
                type="text"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password..."
                className="mt-1 w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-blue-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Resetting this password will immediately update credentials in the database. Please provide the new password to the user securely.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
              >
                {submitting ? 'Resetting...' : 'Confirm Password Reset'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {showDeleteModal && selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteModal(false)}
          title="Delete User Account"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Confirm Account Deletion</span>
              </div>
              <p className="text-slate-300">
                Are you sure you want to permanently delete user account <strong className="text-white">{selectedUser.first_name} {selectedUser.last_name}</strong> ({selectedUser.email})?
              </p>
              <p className="text-slate-400 text-[11px]">
                Tip: If this user has created purchase orders or contracts, consider disabling their login access instead of deleting to preserve historical audit trails.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteUser}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30"
              >
                {submitting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
