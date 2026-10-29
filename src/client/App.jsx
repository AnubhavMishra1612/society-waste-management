import React, { useState, useEffect, useRef } from 'react';

// Extract clean user initials (e.g. "Anita Deshmukh" -> "AD")
const getUserInitials = (name) => {
  if (!name || typeof name !== 'string') return 'SC';
  const clean = name.trim();
  if (!clean) return 'SC';
  const words = clean
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);

  if (words.length === 0) return 'SC';
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

// Demo personas for instant switching & testing
const DEMO_USERS = [
  {
    role: 'resident',
    email: 'resident@greenvista.org',
    password: 'Password123!',
    name: 'Rajesh Sharma',
    badge: 'Resident (Wing B, B-402)'
  },
  {
    role: 'manager',
    email: 'manager@greenvista.org',
    password: 'Password123!',
    name: 'Anita Deshmukh',
    badge: 'Society Secretary (Manager)'
  },
  {
    role: 'staff',
    email: 'staff@greenvista.org',
    password: 'Password123!',
    name: 'Ramesh Kumar',
    badge: 'Housekeeping Staff'
  }
];

const CATEGORIES = [
  { id: 'OVERFLOWING_BIN', label: 'Overflowing Bin', emoji: '🗑️', desc: 'Bin or chute overfilled with garbage' },
  { id: 'MISSED_COLLECTION', label: 'Missed Pickup', emoji: '⏰', desc: 'Scheduled floor or door collection missed' },
  { id: 'UNCLEAN_ROOM', label: 'Unclean Refuse Room', emoji: '🧹', desc: 'Stained floor, spills, or dirty area' },
  { id: 'BAD_ODOUR', label: 'Severe Odour', emoji: '🦨', desc: 'Foul decomposition smell or pests' },
  { id: 'SEGREGATION_VIOLATION', label: 'Segregation Issue', emoji: '♻️', desc: 'Mixed wet/dry waste or dumped items' },
  { id: 'OTHER', label: 'Other Waste Issue', emoji: '📦', desc: 'Bulky trash or general sanitation' }
];

// Production API base configuration: Supports custom remote backend or same-origin fallback
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const apiUrl = (path) => `${API_BASE}${path}`;
const resolveAssetUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('report');
  const [toastMessage, setToastMessage] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Data states
  const [complaints, setComplaints] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters for manager complaints
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [wingFilter, setWingFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filters for staff directory
  const [staffStatusFilter, setStaffStatusFilter] = useState('all');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  // Form states for new complaint
  const [formCategory, setFormCategory] = useState('OVERFLOWING_BIN');
  const [formWing, setFormWing] = useState('Wing B');
  const [formFloor, setFormFloor] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPhoto, setFormPhoto] = useState(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal states: Complaint Details
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Modal states: Assign Staff
  const [assignModalComplaint, setAssignModalComplaint] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignInstructions, setAssignInstructions] = useState('');
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Modal states: Staff Complete/Resolve
  const [resolveModalComplaint, setResolveModalComplaint] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolvePhoto, setResolvePhoto] = useState(null);
  const [resolvePhotoPreview, setResolvePhotoPreview] = useState(null);
  const [resolvingLoading, setResolvingLoading] = useState(false);

  // Modal states: Reopen
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenInput, setShowReopenInput] = useState(false);

  // Modal states: Staff Management
  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
  const [addStaffForm, setAddStaffForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    employeeId: '',
    initialPassword: ''
  });
  const [addStaffLoading, setAddStaffLoading] = useState(false);
  const [addStaffError, setAddStaffError] = useState(null);
  const [createdStaffCredential, setCreatedStaffCredential] = useState(null);

  const [editStaffModalOpen, setEditStaffModalOpen] = useState(false);
  const [editStaffForm, setEditStaffForm] = useState({
    id: '',
    fullName: '',
    email: '',
    phone: '',
    employeeId: ''
  });
  const [editStaffLoading, setEditStaffLoading] = useState(false);
  const [editStaffError, setEditStaffError] = useState(null);

  // Collection Schedule editing states
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleModalMode, setScheduleModalMode] = useState('edit'); // 'create' or 'edit'
  const [scheduleForm, setScheduleForm] = useState({
    id: '',
    wasteCategory: 'WET_ORGANIC',
    daysOfWeek: ['MON'],
    startTime: '08:00',
    endTime: '10:00',
    instructions: '',
    disposalLocation: ''
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);

  // Authentication & Login Screen states
  const [selectedRole, setSelectedRole] = useState('resident'); // 'resident' | 'staff' | 'manager'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Restore authenticated session from localStorage on initial mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('societyclean_auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.token && parsed?.user) {
          setToken(parsed.token);
          setCurrentUser(parsed.user);
          if (parsed.user.role === 'resident') setActiveTab('report');
          else if (parsed.user.role === 'manager') setActiveTab('manager_hub');
          else if (parsed.user.role === 'staff') setActiveTab('staff_queue');
        }
      }
    } catch (e) {
      localStorage.removeItem('societyclean_auth');
    }
  }, []);

  // Safe Logout Action
  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to sign out of your account?')) {
      return;
    }
    setProfileDropdownOpen(false);
    setToken(null);
    setCurrentUser(null);
    setComplaints([]);
    setAnalytics(null);
    setSchedules([]);
    setStaffList([]);
    setStaffDirectory([]);
    setLoginPassword('');
    setLoginError(null);
    localStorage.removeItem('societyclean_auth');
    showToast('You have signed out successfully.');
  };

  // Handle Token Expiry
  const handleSessionExpired = () => {
    setProfileDropdownOpen(false);
    setToken(null);
    setCurrentUser(null);
    setComplaints([]);
    setAnalytics(null);
    setSchedules([]);
    setStaffList([]);
    setStaffDirectory([]);
    localStorage.removeItem('societyclean_auth');
    setLoginError('Your session has expired or is unauthorized. Please sign in again.');
    showToast('Session expired. Please sign in again.');
  };

  // Close profile dropdown card on outside click or Escape key press
  useEffect(() => {
    if (!profileDropdownOpen) return;

    const handleOutsideClick = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileDropdownOpen]);

  // Demo Presentation Quick-Fill (Passwords are pre-filled in masked input, never printed in plaintext)
  const handleFillDemo = (roleKey) => {
    const cred = DEMO_USERS.find(u => u.role === roleKey);
    if (!cred) return;
    setSelectedRole(roleKey);
    setLoginEmail(cred.email);
    setLoginPassword(cred.password);
    setLoginError(null);
    showToast(`Loaded demo credentials for ${cred.name}`);
  };

  // Authenticate against real POST /api/v1/auth/login endpoint
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);

    const emailTrim = loginEmail.trim();
    if (!emailTrim) {
      setLoginError('Please enter your email address');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your password');
      return;
    }

    try {
      setLoginLoading(true);
      const res = await fetch(apiUrl('/api/v1/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrim, password: loginPassword })
      });

      const contentType = res.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (jsonErr) {
          data = null;
        }
      }

      if (!res.ok) {
        if (res.status === 404) {
          setLoginError(
            'Authentication endpoint not found (404). Please ensure the backend is deployed and that VITE_API_URL is properly configured.'
          );
        } else if (res.status >= 500) {
          setLoginError(
            `Authentication service error (${res.status}). The server may still be initializing or unavailable.`
          );
        } else {
          setLoginError(
            data?.error?.message || 'Invalid email or password. Please verify your credentials.'
          );
        }
        return;
      }

      if (!data || !data.success) {
        setLoginError(data?.error?.message || 'Invalid email or password. Please verify your credentials.');
        return;
      }

      const authenticatedUser = data.data.user;
      const serverRole = authenticatedUser.role; // 'resident', 'manager', 'staff'

      // Role selection verification
      if (serverRole !== selectedRole) {
        const roleNames = {
          resident: 'Resident',
          manager: 'Society Manager',
          staff: 'Housekeeping Staff'
        };
        const actualName = roleNames[serverRole] || serverRole;
        const requestedName = roleNames[selectedRole] || selectedRole;

        setLoginError(
          `Portal Mismatch: Your account is registered as "${actualName}", but you selected the "${requestedName}" portal. Please switch to the "${actualName}" portal to sign in.`
        );
        return;
      }

      // Successful login
      setToken(data.data.token);
      setCurrentUser(authenticatedUser);
      localStorage.setItem('societyclean_auth', JSON.stringify({
        token: data.data.token,
        user: authenticatedUser
      }));

      // Redirect to role-appropriate dashboard
      if (serverRole === 'resident') setActiveTab('report');
      else if (serverRole === 'manager') setActiveTab('manager_hub');
      else if (serverRole === 'staff') setActiveTab('staff_queue');

      showToast(`Welcome back, ${authenticatedUser.fullName}! (${serverRole.toUpperCase()})`);
    } catch (err) {
      setLoginError(
        'Network error: Unable to connect to authentication server. Please check your connection or verify the API host.'
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // Fetch relevant data on tab or filter change
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'my_complaints' || activeTab === 'report') {
      fetchMyComplaints();
    } else if (activeTab === 'manager_hub') {
      fetchManagerData();
    } else if (activeTab === 'manage_staff') {
      fetchStaffDirectory();
    } else if (activeTab === 'staff_queue') {
      fetchStaffTasks();
    } else if (activeTab === 'schedule') {
      fetchSchedules();
    }
  }, [activeTab, token, statusFilter, categoryFilter, wingFilter, searchQuery, staffStatusFilter, staffSearchQuery]);

  const fetchMyComplaints = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiUrl('/api/v1/complaints/my'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) setComplaints(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagerData = async () => {
    try {
      setLoading(true);
      // Fetch overview KPIs
      const kpiRes = await fetch(apiUrl('/api/v1/analytics/overview'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (kpiRes.status === 401) {
        handleSessionExpired();
        return;
      }
      const kpiData = await kpiRes.json();
      if (kpiData.success) setAnalytics(kpiData.data);

      // Fetch complaints with filters
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (wingFilter !== 'ALL') params.set('wing', wingFilter);
      if (searchQuery) params.set('search', searchQuery);

      const compRes = await fetch(apiUrl(`/api/v1/complaints?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (compRes.status === 401) {
        handleSessionExpired();
        return;
      }
      const compData = await compRes.json();
      if (compData.success) setComplaints(compData.data);

      // Fetch active staff list for assignment
      await fetchActiveStaffForAssignment();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveStaffForAssignment = async () => {
    try {
      const staffRes = await fetch(apiUrl('/api/v1/users/staff?status=active'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (staffRes.status === 401) {
        handleSessionExpired();
        return;
      }
      const staffData = await staffRes.json();
      if (staffData.success) {
        setStaffList(staffData.data);
        if (staffData.data.length > 0 && !selectedStaffId) {
          setSelectedStaffId(staffData.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch active staff for assignment:', err);
    }
  };

  const fetchStaffDirectory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (staffStatusFilter !== 'all') params.set('status', staffStatusFilter);
      if (staffSearchQuery.trim()) params.set('search', staffSearchQuery.trim());

      const res = await fetch(apiUrl(`/api/v1/users/staff?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setStaffDirectory(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch staff directory:', err);
      showToast('Error loading staff directory');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiUrl('/api/v1/complaints?status=IN_PROGRESS'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) setComplaints(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiUrl('/api/v1/schedules'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) setSchedules(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be less than 5MB');
      return;
    }
    setFormPhoto(file);
    setFormPhotoPreview(URL.createObjectURL(file));
  };

  const handleResolvePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be less than 5MB');
      return;
    }
    setResolvePhoto(file);
    setResolvePhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!formFloor.trim()) {
      showToast('Please specify the floor or area location (e.g. Floor 4 Chute)');
      return;
    }
    if (formDesc.trim().length < 10) {
      showToast('Please provide a description of at least 10 characters');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('category', formCategory);
      formData.append('wing', formWing);
      formData.append('floorLocation', formFloor.trim());
      formData.append('description', formDesc.trim());
      if (formPhoto) formData.append('photo', formPhoto);

      const res = await fetch(apiUrl('/api/v1/complaints'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Complaint lodged successfully! Ref: ${data.data.reference_number}`);
        // Reset form
        setFormFloor('');
        setFormDesc('');
        setFormPhoto(null);
        setFormPhotoPreview(null);
        setActiveTab('my_complaints');
      } else {
        showToast(`Error: ${data.error?.message}`);
      }
    } catch (err) {
      showToast('Submission failed. Check network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Assign Modal and refresh active staff list
  const openAssignModal = async (complaint) => {
    setAssignModalComplaint(complaint);
    setAssignInstructions('');
    await fetchActiveStaffForAssignment();
  };

  const handleAssignSubmit = async () => {
    if (!assignModalComplaint || !selectedStaffId) {
      showToast('Please select an active staff member for assignment');
      return;
    }
    try {
      setAssigningLoading(true);
      const res = await fetch(apiUrl(`/api/v1/complaints/${assignModalComplaint.id}/assign`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          staffUserId: selectedStaffId,
          instructions: assignInstructions
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Task assigned to ${data.data.assigned_staff_name || 'Staff'}. Status: IN_PROGRESS`);
        setAssignModalComplaint(null);
        setAssignInstructions('');
        
        fetchManagerData();
        fetchActiveStaffForAssignment();
        if (selectedComplaint && selectedComplaint.id === assignModalComplaint.id) {
          setSelectedComplaint(data.data);
        }
      } else {
        showToast(`Assignment failed: ${data.error?.message}`);
      }
    } catch (err) {
      showToast('Failed to assign ticket.');
    } finally {
      setAssigningLoading(false);
    }
  };

  const handleResolveSubmit = async () => {
    if (!resolveModalComplaint) return;
    try {
      setResolvingLoading(true);
      const formData = new FormData();
      formData.append('resolutionNotes', resolveNotes || 'Area thoroughly cleared and disinfected.');
      if (resolvePhoto) formData.append('resolutionPhoto', resolvePhoto);

      const res = await fetch(apiUrl(`/api/v1/complaints/${resolveModalComplaint.id}/resolve`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Complaint ${data.data.reference_number} marked as RESOLVED!`);
        setResolveModalComplaint(null);
        setResolveNotes('');
        setResolvePhoto(null);
        setResolvePhotoPreview(null);
        if (currentUser.role === 'staff') fetchStaffTasks();
        else fetchManagerData();
      } else {
        showToast(data.error?.message);
      }
    } catch (err) {
      showToast('Failed to resolve complaint.');
    } finally {
      setResolvingLoading(false);
    }
  };

  const handleReopenSubmit = async (complaintId) => {
    if (!reopenReason.trim()) {
      showToast('Please state why the waste issue is still unresolved');
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/v1/complaints/${complaintId}/reopen`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reopenReason })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Complaint reopened. High priority alert sent to Manager.`);
        setShowReopenInput(false);
        setReopenReason('');
        setSelectedComplaint(data.data);
        fetchMyComplaints();
      } else {
        showToast(data.error?.message);
      }
    } catch (err) {
      showToast('Failed to reopen complaint.');
    }
  };

  const viewComplaintDetail = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/v1/complaints/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedComplaint(data.data);
      }
    } catch (err) {
      showToast('Could not load complaint details');
    }
  };

  // Staff Management Actions
  const handleCreateStaffSubmit = async (e) => {
    e.preventDefault();
    setAddStaffError(null);

    if (!addStaffForm.fullName.trim() || addStaffForm.fullName.trim().length < 2) {
      setAddStaffError('Full name must be at least 2 characters');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!addStaffForm.email.trim() || !emailRegex.test(addStaffForm.email.trim())) {
      setAddStaffError('A valid email address is required');
      return;
    }

    try {
      setAddStaffLoading(true);
      const res = await fetch(apiUrl('/api/v1/users/staff'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: addStaffForm.fullName.trim(),
          email: addStaffForm.email.trim(),
          phone: addStaffForm.phone.trim() || undefined,
          employeeId: addStaffForm.employeeId.trim() || undefined,
          initialPassword: addStaffForm.initialPassword.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Staff member '${data.data.staff.full_name}' created successfully!`);
        setCreatedStaffCredential({
          fullName: data.data.staff.full_name,
          email: data.data.staff.email,
          tempPassword: data.data.temporaryPassword
        });
        setAddStaffModalOpen(false);
        setAddStaffForm({ fullName: '', email: '', phone: '', employeeId: '', initialPassword: '' });
        fetchStaffDirectory();
        fetchActiveStaffForAssignment();
      } else {
        setAddStaffError(data.error?.message || 'Failed to create staff member');
      }
    } catch (err) {
      setAddStaffError('Network error while creating staff member');
    } finally {
      setAddStaffLoading(false);
    }
  };

  const openEditStaffModal = (staff) => {
    setEditStaffForm({
      id: staff.id,
      fullName: staff.full_name,
      email: staff.email,
      phone: staff.phone || '',
      employeeId: staff.employee_id || ''
    });
    setEditStaffError(null);
    setEditStaffModalOpen(true);
  };

  const handleUpdateStaffSubmit = async (e) => {
    e.preventDefault();
    setEditStaffError(null);

    if (!editStaffForm.fullName.trim() || editStaffForm.fullName.trim().length < 2) {
      setEditStaffError('Full name must be at least 2 characters');
      return;
    }

    try {
      setEditStaffLoading(true);
      const res = await fetch(apiUrl(`/api/v1/users/staff/${editStaffForm.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: editStaffForm.fullName.trim(),
          email: editStaffForm.email.trim(),
          phone: editStaffForm.phone.trim() || undefined,
          employeeId: editStaffForm.employeeId.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Staff member '${data.data.full_name}' updated successfully!`);
        setEditStaffModalOpen(false);
        fetchStaffDirectory();
        fetchActiveStaffForAssignment();
      } else {
        setEditStaffError(data.error?.message || 'Failed to update staff member');
      }
    } catch (err) {
      setEditStaffError('Network error while updating staff member');
    } finally {
      setEditStaffLoading(false);
    }
  };

  const handleToggleStaffStatus = async (staff) => {
    const nextStatus = !staff.is_active;
    const actionLabel = nextStatus ? 'activate' : 'deactivate';

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${staff.full_name}?`)) {
      return;
    }

    try {
      const res = await fetch(apiUrl(`/api/v1/users/staff/${staff.id}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: nextStatus })
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Staff member '${staff.full_name}' has been ${nextStatus ? 'activated' : 'deactivated'}.`);
        fetchStaffDirectory();
        fetchActiveStaffForAssignment();
        fetchManagerData();
      } else {
        showToast(`Cannot change status: ${data.error?.message}`);
      }
    } catch (err) {
      showToast('Network error while changing staff status');
    }
  };

  // Schedule Management Handlers (Manager)
  const openEditScheduleModal = (s) => {
    setScheduleForm({
      id: s.id,
      wasteCategory: s.waste_category,
      daysOfWeek: Array.isArray(s.days_of_week) ? [...s.days_of_week] : [],
      startTime: s.start_time,
      endTime: s.end_time,
      instructions: s.instructions || '',
      disposalLocation: s.disposal_location || ''
    });
    setScheduleModalMode('edit');
    setScheduleError(null);
    setScheduleModalOpen(true);
  };

  const openAddScheduleModal = () => {
    setScheduleForm({
      id: '',
      wasteCategory: 'WET_ORGANIC',
      daysOfWeek: ['MON', 'WED', 'FRI'],
      startTime: '08:00',
      endTime: '10:00',
      instructions: '',
      disposalLocation: ''
    });
    setScheduleModalMode('create');
    setScheduleError(null);
    setScheduleModalOpen(true);
  };

  const handleToggleScheduleDay = (day) => {
    setScheduleForm(prev => {
      const exists = prev.daysOfWeek.includes(day);
      const nextDays = exists 
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day];
      return { ...prev, daysOfWeek: nextDays };
    });
  };

  const handleSaveScheduleSubmit = async (e) => {
    e.preventDefault();
    setScheduleError(null);

    if (!scheduleForm.wasteCategory.trim()) {
      setScheduleError('Waste category is required');
      return;
    }
    if (scheduleForm.daysOfWeek.length === 0) {
      setScheduleError('Please select at least one collection day');
      return;
    }
    if (!scheduleForm.startTime || !scheduleForm.endTime) {
      setScheduleError('Start time and end time are required');
      return;
    }
    if (scheduleForm.startTime >= scheduleForm.endTime) {
      setScheduleError('Start time must be strictly earlier than end time');
      return;
    }

    const actionText = scheduleModalMode === 'create' ? 'create this new timetable slot' : 'update this collection schedule';
    if (!window.confirm(`Are you sure you want to ${actionText}?`)) {
      return;
    }

    try {
      setScheduleLoading(true);
      const url = scheduleModalMode === 'create' 
        ? apiUrl('/api/v1/schedules') 
        : apiUrl(`/api/v1/schedules/${scheduleForm.id}`);
      const method = scheduleModalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          wasteCategory: scheduleForm.wasteCategory,
          daysOfWeek: scheduleForm.daysOfWeek,
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime,
          instructions: scheduleForm.instructions.trim(),
          disposalLocation: scheduleForm.disposalLocation.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(scheduleModalMode === 'create' ? 'New collection schedule slot created!' : 'Collection schedule updated successfully!');
        setScheduleModalOpen(false);
        fetchSchedules();
      } else {
        setScheduleError(data.error?.message || 'Failed to save collection schedule');
      }
    } catch (err) {
      setScheduleError('Network error while saving schedule');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDeleteSchedule = async (s) => {
    if (!window.confirm(`Are you sure you want to remove the collection schedule for "${s.waste_category.replace(/_/g, ' ')}"?`)) {
      return;
    }

    try {
      const res = await fetch(apiUrl(`/api/v1/schedules/${s.id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Schedule slot removed successfully.');
        fetchSchedules();
      } else {
        showToast(`Cannot delete schedule: ${data.error?.message}`);
      }
    } catch (err) {
      showToast('Network error while deleting schedule');
    }
  };

  // Unauthenticated Entry: Render Professional Civic Login Screen
  if (!currentUser || !token) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-brand-icon" aria-hidden="true">♻️</div>
            <h1 className="auth-title">
              SocietyClean
              <span className="brand-tag">Portal</span>
            </h1>
            <p className="auth-subtitle">
              Residential Waste Management & Housekeeping Coordination
            </p>
            <div className="auth-society-badge">
              <span>🏢</span> Green Vista CHS • ID: GREEN-VISTA-01
            </div>
          </div>

          {/* Role Portal Selection Tabs */}
          <div className="auth-roles-section" role="region" aria-label="Access portal selection">
            <label className="auth-roles-label" id="portal-selector-label">
              Select Access Portal
            </label>
            <div className="auth-role-grid" role="tablist" aria-labelledby="portal-selector-label">
              <button
                type="button"
                role="tab"
                id="portal-tab-resident"
                aria-selected={selectedRole === 'resident'}
                className={`auth-role-card ${selectedRole === 'resident' ? 'selected' : ''}`}
                onClick={() => { setSelectedRole('resident'); setLoginError(null); }}
              >
                <span className="auth-role-emoji" aria-hidden="true">🏠</span>
                <span className="auth-role-name">Resident</span>
                <span className="auth-role-desc">Report & Track</span>
              </button>

              <button
                type="button"
                role="tab"
                id="portal-tab-staff"
                aria-selected={selectedRole === 'staff'}
                className={`auth-role-card ${selectedRole === 'staff' ? 'selected' : ''}`}
                onClick={() => { setSelectedRole('staff'); setLoginError(null); }}
              >
                <span className="auth-role-emoji" aria-hidden="true">🧹</span>
                <span className="auth-role-name">Staff</span>
                <span className="auth-role-desc">Task Queue</span>
              </button>

              <button
                type="button"
                role="tab"
                id="portal-tab-manager"
                aria-selected={selectedRole === 'manager'}
                className={`auth-role-card ${selectedRole === 'manager' ? 'selected' : ''}`}
                onClick={() => { setSelectedRole('manager'); setLoginError(null); }}
              >
                <span className="auth-role-emoji" aria-hidden="true">📋</span>
                <span className="auth-role-name">Manager</span>
                <span className="auth-role-desc">Ops & Roster</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {loginError && (
            <div className="auth-error-alert" role="alert" aria-live="polite">
              <span aria-hidden="true">⚠️</span>
              <div>{loginError}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Email Address <span className="req">*</span>
              </label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder={
                  selectedRole === 'resident'
                    ? 'e.g. resident@greenvista.org'
                    : selectedRole === 'staff'
                    ? 'e.g. staff@greenvista.org'
                    : 'e.g. manager@greenvista.org'
                }
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Password <span className="req">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your account password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', marginTop: '0.5rem', minHeight: '46px' }}
              disabled={loginLoading}
            >
              {loginLoading
                ? 'Authenticating...'
                : `Sign In as ${selectedRole === 'resident' ? 'Resident' : selectedRole === 'staff' ? 'Housekeeping Staff' : 'Society Manager'} →`}
            </button>
          </form>

          {/* Presentation Quick-Fill (Preserved for College Project Demonstration) */}
          <div className="auth-demo-helper">
            <div className="auth-demo-header">
              <span className="auth-demo-title">🎓 Presentation Quick-Fill</span>
              <span className="auth-demo-tip">Masked credentials helper</span>
            </div>
            <div className="auth-demo-grid">
              <button
                type="button"
                className="auth-demo-btn"
                onClick={() => handleFillDemo('resident')}
                title="Fill verified Resident demo credentials"
              >
                <span>🏠 Rajesh Sharma (Wing B)</span>
                <span className="auth-demo-btn-role">Resident</span>
              </button>
              <button
                type="button"
                className="auth-demo-btn"
                onClick={() => handleFillDemo('staff')}
                title="Fill verified Housekeeping Staff demo credentials"
              >
                <span>🧹 Ramesh Kumar (Housekeeping)</span>
                <span className="auth-demo-btn-role">Staff</span>
              </button>
              <button
                type="button"
                className="auth-demo-btn"
                onClick={() => handleFillDemo('manager')}
                title="Fill verified Society Manager demo credentials"
              >
                <span>📋 Anita Deshmukh (Secretary)</span>
                <span className="auth-demo-btn-role">Manager</span>
              </button>
            </div>
          </div>

          <div className="auth-security-note">
            🔒 Stateless JWT session • Multi-tenant society boundary enforced
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="toast" role="status" aria-live="polite">
            <span aria-hidden="true">ℹ️</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // Resident summary metrics calculated from real loaded data
  const residentSummary = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'PENDING').length,
    inProgress: complaints.filter(c => c.status === 'IN_PROGRESS').length,
    resolved: complaints.filter(c => c.status === 'RESOLVED').length
  };

  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <header className="top-nav" role="banner">
        <div className="nav-inner">
          <div className="brand-wrapper">
            <div className="brand-icon" aria-hidden="true">♻️</div>
            <div className="brand-title">
              SocietyClean
              <span className="brand-tag">Portal</span>
            </div>
          </div>

          {currentUser && (
            <div className="profile-menu-container" ref={profileMenuRef}>
              <button
                type="button"
                className={`profile-avatar-btn ${profileDropdownOpen ? 'active' : ''}`}
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
                aria-label={`User profile menu for ${currentUser.fullName}`}
                title={`User profile menu for ${currentUser.fullName}`}
              >
                {getUserInitials(currentUser.fullName)}
              </button>

              {profileDropdownOpen && (
                <div
                  className="profile-dropdown-card"
                  role="menu"
                  aria-label="User profile options"
                >
                  {/* Profile Header */}
                  <div className="profile-card-header">
                    <div className="profile-card-avatar" aria-hidden="true">
                      {getUserInitials(currentUser.fullName)}
                    </div>
                    <div className="profile-card-user">
                      <div className="profile-card-name">{currentUser.fullName}</div>
                      <span className={`badge badge-${currentUser.role} profile-card-role`}>
                        {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="profile-card-contact">
                    <div className="profile-contact-row">
                      <span className="profile-contact-icon" aria-hidden="true">✉️</span>
                      <span className="profile-contact-text profile-contact-email" title={currentUser.email}>
                        {currentUser.email}
                      </span>
                    </div>
                    <div className="profile-contact-row">
                      <span className="profile-contact-icon" aria-hidden="true">📞</span>
                      <span className={`profile-contact-text ${!currentUser.phone ? 'profile-contact-missing' : ''}`}>
                        {currentUser.phone ? currentUser.phone : 'Phone not added'}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="profile-card-divider" />

                  {/* Actions */}
                  <div className="profile-card-actions">
                    <button
                      type="button"
                      role="menuitem"
                      className="profile-signout-btn"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                    >
                      <span className="profile-signout-icon" aria-hidden="true">🚪</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content" role="main">
        {/* Society Hero Banner */}
        <section className="hero-banner" aria-label="Society Information Overview">
          <div className="hero-info">
            <h1>Green Vista Cooperative Housing Society</h1>
            <div className="hero-subtitle">
              <span>📍 Sector 14, Mumbai</span>
              <span aria-hidden="true">•</span>
              <span>Society ID: <strong>GREEN-VISTA-01</strong></span>
              <span aria-hidden="true">•</span>
              <span>Portal: <strong style={{ color: 'var(--color-primary-300)', textTransform: 'capitalize' }}>{currentUser?.role}</strong></span>
            </div>
          </div>
          <div className="hero-pickup-card">
            <div className="pickup-icon" aria-hidden="true">🌿</div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-white)' }}>Today's Waste Timetable</div>
              <div style={{ color: 'var(--color-primary-200)', fontSize: '0.8rem' }}>
                Wet Waste: 8:00 AM - 10:00 AM (Daily Pickup)
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Navigation Tabs */}
        <nav className="tabs-nav" role="tablist" aria-label="Dashboard views">
          {currentUser?.role === 'resident' && (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'report'}
                className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
                onClick={() => setActiveTab('report')}
              >
                📝 Report Waste Issue
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'my_complaints'}
                className={`tab-btn ${activeTab === 'my_complaints' ? 'active' : ''}`}
                onClick={() => setActiveTab('my_complaints')}
              >
                📋 My Complaints
                <span className="tab-count">{complaints.length}</span>
              </button>
            </>
          )}

          {currentUser?.role === 'manager' && (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'manager_hub'}
                className={`tab-btn ${activeTab === 'manager_hub' ? 'active' : ''}`}
                onClick={() => setActiveTab('manager_hub')}
              >
                📊 Operations Hub
                <span className="tab-count">{complaints.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'manage_staff'}
                className={`tab-btn ${activeTab === 'manage_staff' ? 'active' : ''}`}
                onClick={() => setActiveTab('manage_staff')}
              >
                👥 Manage Staff
                <span className="tab-count">{staffDirectory.length}</span>
              </button>
            </>
          )}

          {currentUser?.role === 'staff' && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'staff_queue'}
              className={`tab-btn ${activeTab === 'staff_queue' ? 'active' : ''}`}
              onClick={() => setActiveTab('staff_queue')}
            >
              🧹 Staff Task Queue
              <span className="tab-count">{complaints.length}</span>
            </button>
          )}

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'schedule'}
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            📅 Collection Timetable
          </button>
        </nav>

        {/* TAB 1: REPORT WASTE ISSUE FORM (RESIDENT) */}
        {activeTab === 'report' && currentUser?.role === 'resident' && (
          <div className="report-form-grid">
            <div className="clean-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.35rem', color: 'var(--color-primary-900)' }}>
                Report Sanitation or Waste Incident
              </h2>
              <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Provide exact location details and an optional photo. Housekeeping will be dispatched immediately.
              </p>

              <form onSubmit={handleSubmitComplaint}>
                {/* Category Selection Grid */}
                <div className="form-group">
                  <label className="form-label" id="category-select-label">
                    Select Issue Category <span className="req">*</span>
                  </label>
                  <div
                    className="category-selection-grid"
                    role="radiogroup"
                    aria-labelledby="category-select-label"
                  >
                    {CATEGORIES.map((cat) => (
                      <div
                        key={cat.id}
                        role="radio"
                        aria-checked={formCategory === cat.id}
                        tabIndex={0}
                        className={`category-card ${formCategory === cat.id ? 'selected' : ''}`}
                        onClick={() => setFormCategory(cat.id)}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setFormCategory(cat.id);
                          }
                        }}
                      >
                        <span className="cat-emoji" aria-hidden="true">{cat.emoji}</span>
                        <span className="cat-name">{cat.label}</span>
                        <span className="cat-desc">{cat.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Location row */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="form-wing-select">
                      Wing / Tower <span className="req">*</span>
                    </label>
                    <select
                      id="form-wing-select"
                      className="form-select"
                      value={formWing}
                      onChange={(e) => setFormWing(e.target.value)}
                    >
                      <option value="Wing A">Wing A</option>
                      <option value="Wing B">Wing B</option>
                      <option value="Wing C">Wing C</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="form-floor-input">
                      Floor or Collection Point <span className="req">*</span>
                    </label>
                    <input
                      id="form-floor-input"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Floor 4 Chute or Ground Foyer"
                      value={formFloor}
                      onChange={(e) => setFormFloor(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label" htmlFor="form-desc-input">
                    Description <span className="req">*</span>
                  </label>
                  <textarea
                    id="form-desc-input"
                    className="form-textarea"
                    rows="3"
                    placeholder="Describe the issue (e.g. Bin overflowing with organic waste, bad odour spreading into common corridor)"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    required
                  />
                  <div style={{
                    fontSize: '0.75rem',
                    color: formDesc.length > 0 && formDesc.length < 10 ? 'var(--color-reopened)' : 'var(--color-neutral-500)',
                    textAlign: 'right',
                    marginTop: '0.25rem'
                  }}>
                    {formDesc.length} / 1000 characters {formDesc.length < 10 ? '(min. 10 required)' : '✓'}
                  </div>
                </div>

                {/* Photo Upload Dropzone */}
                <div className="form-group">
                  <label className="form-label" htmlFor="form-photo-upload">
                    Attach Incident Photo Proof (Optional, max 5MB)
                  </label>
                  {!formPhotoPreview ? (
                    <label className="file-upload-box" htmlFor="form-photo-upload">
                      <div className="upload-icon" aria-hidden="true">📷</div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-primary-800)' }}>
                        Click to select or drag photo here
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', marginTop: '0.2rem' }}>
                        Supports JPEG, PNG, WebP (up to 5MB)
                      </div>
                      <input
                        id="form-photo-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={handlePhotoSelect}
                      />
                    </label>
                  ) : (
                    <div className="file-preview-wrapper">
                      <img src={formPhotoPreview} alt="Preview of issue to lodge" className="file-preview-img" />
                      <button
                        type="button"
                        className="btn-remove-preview"
                        onClick={() => {
                          setFormPhoto(null);
                          setFormPhotoPreview(null);
                        }}
                        title="Remove attached photo"
                        aria-label="Remove attached photo"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                  style={{ width: '100%', marginTop: '0.5rem', minHeight: '44px' }}
                >
                  {submitting ? 'Submitting Report...' : '🚀 Submit Waste Incident Report'}
                </button>
              </form>
            </div>

            {/* Sidebar Guidelines */}
            <div>
              <div className="clean-card" style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', color: 'var(--color-primary-800)', marginBottom: '0.65rem' }}>
                  💡 Waste Segregation Directives
                </h3>
                <ul style={{ fontSize: '0.825rem', color: 'var(--color-neutral-700)', paddingLeft: '1.25rem', lineHeight: '1.65' }}>
                  <li><strong>Green Bin (Wet):</strong> Cooked food, vegetable scraps, tea leaves, fruit peels.</li>
                  <li><strong>Blue Bin (Dry):</strong> Flattened cartons, clean plastic containers, dry paper.</li>
                  <li><strong>Hazardous:</strong> Batteries, chemicals, and bulbs must not be thrown in chute.</li>
                </ul>
              </div>

              <div className="clean-card">
                <h3 style={{ fontSize: '0.95rem', color: 'var(--color-primary-800)', marginBottom: '0.45rem' }}>
                  ⏱️ Resolution SLA Commitment
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--color-neutral-600)', lineHeight: '1.55' }}>
                  Sanitation issues are reviewed by housekeeping management within <strong>15 minutes</strong> and cleared within <strong>2 hours</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RESIDENT MY COMPLAINTS LIST */}
        {activeTab === 'my_complaints' && currentUser?.role === 'resident' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', color: 'var(--color-primary-900)' }}>My Lodged Complaints</h2>
                <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.85rem' }}>
                  Track live status, housekeeping assignments, and photo resolution proofs.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setActiveTab('report')}
              >
                + Lodge New Complaint
              </button>
            </div>

            {/* Resident Summary Cards */}
            <div className="resident-summary-grid">
              <div className="resident-summary-card">
                <div className="resident-summary-icon" style={{ backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-800)' }}>
                  📋
                </div>
                <div>
                  <div className="resident-summary-num">{residentSummary.total}</div>
                  <div className="resident-summary-label">Total Lodged</div>
                </div>
              </div>

              <div className="resident-summary-card">
                <div className="resident-summary-icon" style={{ backgroundColor: 'var(--color-pending-bg)', color: 'var(--color-pending)' }}>
                  ⏳
                </div>
                <div>
                  <div className="resident-summary-num">{residentSummary.pending}</div>
                  <div className="resident-summary-label">Pending Review</div>
                </div>
              </div>

              <div className="resident-summary-card">
                <div className="resident-summary-icon" style={{ backgroundColor: 'var(--color-progress-bg)', color: 'var(--color-progress)' }}>
                  🧹
                </div>
                <div>
                  <div className="resident-summary-num">{residentSummary.inProgress}</div>
                  <div className="resident-summary-label">In Progress</div>
                </div>
              </div>

              <div className="resident-summary-card">
                <div className="resident-summary-icon" style={{ backgroundColor: 'var(--color-resolved-bg)', color: 'var(--color-resolved)' }}>
                  ✅
                </div>
                <div>
                  <div className="resident-summary-num">{residentSummary.resolved}</div>
                  <div className="resident-summary-label">Cleaned & Resolved</div>
                </div>
              </div>
            </div>

            {complaints.length === 0 ? (
              <div className="clean-card empty-state">
                <div className="empty-icon" aria-hidden="true">🎉</div>
                <div className="empty-title">No Active Complaints</div>
                <div className="empty-desc">You have no active waste or sanitation tickets filed. All clean!</div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setActiveTab('report')}
                >
                  Report an Issue
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {complaints.map((c) => (
                  <div key={c.id} className="clean-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <span className="ref-pill">{c.reference_number}</span>
                        <span className={`badge badge-${c.status.toLowerCase()}`}>
                          {c.status}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-neutral-900)', marginBottom: '0.25rem' }}>
                        {c.category.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-primary-700)', fontWeight: '600', marginBottom: '0.5rem' }}>
                        📍 {c.wing} • {c.floor_location}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-700)', marginBottom: '0.85rem', lineHeight: '1.5' }}>
                        {c.description}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-neutral-200)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)' }}>
                        Lodged: {new Date(c.created_at).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => viewComplaintDetail(c.id)}
                      >
                        View Details & Stepper →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MANAGER OPERATIONS HUB */}
        {activeTab === 'manager_hub' && currentUser?.role === 'manager' && (
          <div>
            {/* KPI Cards */}
            {analytics && (
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon-wrap" style={{ backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-800)' }}>
                    📊
                  </div>
                  <div>
                    <div className="kpi-num">{analytics.kpis.totalActive}</div>
                    <div className="kpi-label">Total Active Issues</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon-wrap" style={{ backgroundColor: 'var(--color-pending-bg)', color: 'var(--color-pending)' }}>
                    ⏳
                  </div>
                  <div>
                    <div className="kpi-num">{analytics.kpis.pendingAssignment}</div>
                    <div className="kpi-label">Pending Assignment</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon-wrap" style={{ backgroundColor: 'var(--color-progress-bg)', color: 'var(--color-progress)' }}>
                    🧹
                  </div>
                  <div>
                    <div className="kpi-num">{analytics.kpis.inProgress}</div>
                    <div className="kpi-label">In Progress</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon-wrap" style={{ backgroundColor: 'var(--color-resolved-bg)', color: 'var(--color-resolved)' }}>
                    ✅
                  </div>
                  <div>
                    <div className="kpi-num">{analytics.kpis.resolvedTotal}</div>
                    <div className="kpi-label">Resolved Cleanups</div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Toolbar */}
            <div className="toolbar-wrap">
              <div className="toolbar-filters">
                <input
                  type="text"
                  className="search-input"
                  placeholder="🔍 Search Ref ID, location, resident, details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search complaints"
                />

                <select
                  className="form-select"
                  style={{ width: 'auto' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter complaints by status"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="REOPENED">Reopened</option>
                </select>

                <select
                  className="form-select"
                  style={{ width: 'auto' }}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter complaints by category"
                >
                  <option value="ALL">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>

                <select
                  className="form-select"
                  style={{ width: 'auto' }}
                  value={wingFilter}
                  onChange={(e) => setWingFilter(e.target.value)}
                  aria-label="Filter complaints by wing"
                >
                  <option value="ALL">All Wings</option>
                  <option value="Wing A">Wing A</option>
                  <option value="Wing B">Wing B</option>
                  <option value="Wing C">Wing C</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={fetchManagerData}
                >
                  🔄 Refresh
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setActiveTab('manage_staff')}
                >
                  👥 Manage Staff
                </button>
              </div>
            </div>

            {/* Complaints Data Table */}
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ref Number</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Resident</th>
                    <th>Status</th>
                    <th>Assigned Staff</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-neutral-500)' }}>
                        No complaints matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    complaints.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span className="ref-pill">{c.reference_number}</span>
                        </td>
                        <td>
                          <strong>{c.category.replace(/_/g, ' ')}</strong>
                        </td>
                        <td>
                          {c.wing} • {c.floor_location}
                        </td>
                        <td>
                          {c.resident_name} ({c.resident_flat || 'Unit'})
                        </td>
                        <td>
                          <span className={`badge badge-${c.status.toLowerCase()}`}>
                            {c.status}
                          </span>
                        </td>
                        <td>
                          {c.assigned_staff_name ? (
                            <span style={{ color: 'var(--color-primary-800)', fontWeight: 600 }}>
                              👤 {c.assigned_staff_name}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-pending)', fontWeight: 600, fontSize: '0.8rem' }}>
                              ⚠️ Unassigned
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', minHeight: '32px' }}
                              onClick={() => viewComplaintDetail(c.id)}
                            >
                              Inspect
                            </button>
                            {c.status !== 'RESOLVED' && (
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', minHeight: '32px' }}
                                onClick={() => openAssignModal(c)}
                              >
                                Assign
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: MANAGE STAFF (MANAGER ONLY) */}
        {activeTab === 'manage_staff' && currentUser?.role === 'manager' && (
          <div>
            <div className="staff-header-wrap">
              <div>
                <h2 style={{ fontSize: '1.35rem', color: 'var(--color-primary-900)', marginBottom: '0.25rem' }}>
                  Housekeeping Staff Management
                </h2>
                <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.85rem' }}>
                  Add, edit, monitor active workloads, and manage employment status for society cleaning staff.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setAddStaffError(null);
                  setAddStaffModalOpen(true);
                }}
              >
                + Add Staff Member
              </button>
            </div>

            {/* Created Staff Credential Banner */}
            {createdStaffCredential && (
              <div className="credential-banner">
                <div className="credential-info">
                  <div style={{ fontWeight: 700, color: 'var(--color-primary-900)', fontSize: '0.925rem' }}>
                    🎉 New Staff Member Registered: <strong>{createdStaffCredential.fullName}</strong>
                  </div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--color-neutral-700)' }}>
                    Login Email: <code>{createdStaffCredential.email}</code> • Temporary Password:{' '}
                    <span className="temp-password-box">{createdStaffCredential.tempPassword}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', marginTop: '0.15rem' }}>
                    Please share these credentials with the employee. This temporary password will not be shown again.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Email: ${createdStaffCredential.email}\nPassword: ${createdStaffCredential.tempPassword}`
                    );
                    showToast('Credentials copied to clipboard!');
                  }}
                >
                  📋 Copy Credentials
                </button>
              </div>
            )}

            {/* Staff Search & Filter Bar */}
            <div className="toolbar-wrap">
              <div className="toolbar-filters">
                <input
                  type="text"
                  className="search-input"
                  placeholder="🔍 Search staff by name, email, phone, ID..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  aria-label="Search staff members"
                />

                <select
                  className="form-select"
                  style={{ width: 'auto' }}
                  value={staffStatusFilter}
                  onChange={(e) => setStaffStatusFilter(e.target.value)}
                  aria-label="Filter staff by status"
                >
                  <option value="all">All Employment Statuses</option>
                  <option value="active">Active Staff Only</option>
                  <option value="inactive">Inactive Staff Only</option>
                </select>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={fetchStaffDirectory}
              >
                🔄 Refresh Directory
              </button>
            </div>

            {/* Staff Directory Table */}
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Employee ID</th>
                    <th>Phone</th>
                    <th>Active Workload</th>
                    <th>Total Completed</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffDirectory.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <div className="empty-state">
                          <div className="empty-icon" aria-hidden="true">🧹</div>
                          <div className="empty-title">No Staff Found</div>
                          <div className="empty-desc">No housekeeping staff members match your query.</div>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => {
                              setAddStaffError(null);
                              setAddStaffModalOpen(true);
                            }}
                          >
                            + Add First Staff Member
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    staffDirectory.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div className="staff-table-avatar" aria-hidden="true">
                              {s.full_name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--color-neutral-900)' }}>
                                {s.full_name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)' }}>
                                {s.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {s.employee_id ? (
                            <span className="emp-id-tag">{s.employee_id}</span>
                          ) : (
                            <span style={{ color: 'var(--color-neutral-400)', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          {s.phone ? (
                            <span style={{ fontSize: '0.825rem' }}>📞 {s.phone}</span>
                          ) : (
                            <span style={{ color: 'var(--color-neutral-400)', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`workload-pill ${
                              s.active_tasks_count > 2
                                ? 'workload-busy'
                                : s.active_tasks_count > 0
                                ? 'workload-light'
                                : 'workload-free'
                            }`}
                          >
                            {s.active_tasks_count === 0 ? '✓ Free (0 tasks)' : `🧹 ${s.active_tasks_count} active task(s)`}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--color-primary-800)' }}>{s.total_completed_tasks_count}</strong> cleanups
                        </td>
                        <td>
                          <span className={`badge ${s.is_active ? 'badge-active' : 'badge-inactive'}`}>
                            {s.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', minHeight: '32px' }}
                              onClick={() => openEditStaffModal(s)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className={s.is_active ? 'btn-danger' : 'btn-primary'}
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', minHeight: '32px' }}
                              onClick={() => handleToggleStaffStatus(s)}
                            >
                              {s.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: STAFF MOBILE TASK QUEUE (STAFF VIEW) */}
        {activeTab === 'staff_queue' && currentUser?.role === 'staff' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--color-primary-900)' }}>
                Active Tasks Assigned to You
              </h2>
              <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.85rem' }}>
                Complete cleanups at the designated locations and upload after-cleanup photo evidence.
              </p>
            </div>

            {complaints.length === 0 ? (
              <div className="clean-card empty-state">
                <div className="empty-icon" aria-hidden="true">✨</div>
                <div className="empty-title">All Caught Up!</div>
                <div className="empty-desc">No tasks currently assigned to your queue. Enjoy your shift!</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {complaints.map((c) => (
                  <div key={c.id} className="clean-card" style={{ borderLeft: '4px solid var(--color-primary-700)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="ref-pill">{c.reference_number}</span>
                      <span className="badge badge-in_progress">IN PROGRESS</span>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem', color: 'var(--color-neutral-900)' }}>
                      {c.category.replace(/_/g, ' ')}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-primary-800)', fontWeight: '700', marginBottom: '0.5rem' }}>
                      📍 {c.wing} • {c.floor_location}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-700)', marginBottom: '1rem', backgroundColor: 'var(--color-neutral-50)', padding: '0.65rem', borderRadius: 'var(--radius-md)' }}>
                      "{c.description}"
                    </p>

                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: '100%', minHeight: '42px' }}
                      onClick={() => {
                        setResolveModalComplaint(c);
                        setResolveNotes('');
                        setResolvePhoto(null);
                        setResolvePhotoPreview(null);
                      }}
                    >
                      ✅ Mark Cleaned & Resolved
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: COLLECTION SCHEDULE TIMETABLE */}
        {activeTab === 'schedule' && (
          <div>
            <div className="schedule-header-wrap">
              <div>
                <h2 style={{ fontSize: '1.35rem', color: 'var(--color-primary-900)', marginBottom: '0.25rem' }}>
                  Weekly Society Waste Collection Timetable
                </h2>
                <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.85rem' }}>
                  Adhere to segregated pickup times to prevent municipal non-compliance penalties.
                </p>
              </div>
              {currentUser?.role === 'manager' && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={openAddScheduleModal}
                >
                  + Add Schedule Slot
                </button>
              )}
            </div>

            {schedules.length === 0 ? (
              <div className="clean-card empty-state">
                <div className="empty-icon" aria-hidden="true">📅</div>
                <div className="empty-title">No Timetable Slots Defined</div>
                <div className="empty-desc">There are currently no active collection schedules for this society.</div>
                {currentUser?.role === 'manager' && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={openAddScheduleModal}
                    style={{ marginTop: '0.75rem' }}
                  >
                    + Add First Schedule Slot
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.15rem' }}>
                {schedules.map((s) => (
                  <div
                    key={s.id}
                    className="clean-card"
                    style={{
                      borderTop: `4px solid ${
                        s.waste_category === 'WET_ORGANIC'
                          ? '#059669'
                          : s.waste_category === 'DRY_RECYCLABLE'
                          ? '#2563eb'
                          : s.waste_category === 'E_WASTE_HAZARDOUS'
                          ? '#dc2626'
                          : '#d97706'
                      }`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.35rem' }} aria-hidden="true">
                          {s.waste_category === 'WET_ORGANIC' ? '🥬' : s.waste_category === 'DRY_RECYCLABLE' ? '📦' : s.waste_category === 'GARDEN_PRUNINGS' ? '🌿' : '🔋'}
                        </span>
                        <h3 style={{ fontSize: '1.05rem', color: 'var(--color-neutral-900)' }}>
                          {s.waste_category.replace(/_/g, ' ')}
                        </h3>
                      </div>
                      {s.disposal_location && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-800)', backgroundColor: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-xs)', fontWeight: 600 }}>
                          📍 {s.disposal_location}
                        </span>
                      )}
                    </div>

                    <div style={{ margin: '0.75rem 0', padding: '0.65rem 0.75rem', backgroundColor: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-200)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)' }}>Collection Days</div>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary-800)', fontSize: '0.875rem' }}>
                        {s.days_of_week.join(' • ')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', marginTop: '0.35rem' }}>Time Window</div>
                      <div style={{ fontWeight: 700, color: 'var(--color-neutral-800)', fontSize: '0.875rem' }}>
                        ⏰ {s.start_time} - {s.end_time}
                      </div>
                    </div>

                    <p style={{ fontSize: '0.825rem', color: 'var(--color-neutral-600)', lineHeight: '1.5' }}>
                      {s.instructions || 'No specific disposal instructions provided.'}
                    </p>

                    {/* Manager Edit Actions */}
                    {currentUser?.role === 'manager' && (
                      <div className="schedule-card-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ flex: 1, padding: '0.35rem 0.65rem', fontSize: '0.8rem', minHeight: '34px' }}
                          onClick={() => openEditScheduleModal(s)}
                        >
                          ✏️ Edit Schedule
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', minHeight: '34px' }}
                          title="Delete Schedule Slot"
                          onClick={() => handleDeleteSchedule(s)}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL: COMPLAINT DETAIL & STEPPER */}
        {selectedComplaint && (
          <div className="modal-overlay" onClick={() => setSelectedComplaint(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-detail-title">
              <div className="modal-header">
                <div>
                  <span className="ref-pill">{selectedComplaint.reference_number}</span>
                  <span className={`badge badge-${selectedComplaint.status.toLowerCase()}`} style={{ marginLeft: '0.5rem' }}>
                    {selectedComplaint.status}
                  </span>
                </div>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setSelectedComplaint(null)}
                  title="Close modal"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

              {/* Status Stepper */}
              <div className="stepper-wrap" aria-label="Progress Stepper">
                <div className="stepper-step completed">
                  <div className="step-circle">✓</div>
                  <div className="step-title">Reported</div>
                </div>

                <div className={`stepper-step ${selectedComplaint.status !== 'PENDING' ? 'completed' : 'active'}`}>
                  <div className="step-circle">
                    {selectedComplaint.status !== 'PENDING' ? '✓' : '2'}
                  </div>
                  <div className="step-title">In Progress</div>
                </div>

                <div className={`stepper-step ${selectedComplaint.status === 'RESOLVED' ? 'completed' : ''}`}>
                  <div className="step-circle">
                    {selectedComplaint.status === 'RESOLVED' ? '✓' : '3'}
                  </div>
                  <div className="step-title">Resolved</div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <h3 id="modal-detail-title" style={{ fontSize: '1.15rem', marginBottom: '0.25rem', color: 'var(--color-neutral-900)' }}>
                  {selectedComplaint.category.replace(/_/g, ' ')}
                </h3>
                <div style={{ color: 'var(--color-primary-800)', fontWeight: 600, fontSize: '0.85rem' }}>
                  📍 {selectedComplaint.wing} • {selectedComplaint.floor_location}
                </div>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-neutral-700)', backgroundColor: 'var(--color-neutral-50)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-200)', lineHeight: '1.5' }}>
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Photos comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: selectedComplaint.resolution_photo_url ? '1fr 1fr' : '1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                {selectedComplaint.photo_url && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-neutral-600)', marginBottom: '0.25rem' }}>Reported Incident Photo</div>
                    <img src={resolveAssetUrl(selectedComplaint.photo_url)} alt="Reported Incident" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-200)' }} />
                  </div>
                )}
                {selectedComplaint.resolution_photo_url && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-resolved)', marginBottom: '0.25rem' }}>Resolved Cleanup Proof</div>
                    <img src={resolveAssetUrl(selectedComplaint.resolution_photo_url)} alt="Resolved Cleanup Proof" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-resolved-border)' }} />
                  </div>
                )}
              </div>

              {selectedComplaint.resolution_notes && (
                <div style={{ backgroundColor: 'var(--color-resolved-bg)', border: '1px solid var(--color-resolved-border)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-resolved)', fontSize: '0.85rem' }}>✅ Resolution Note:</div>
                  <div style={{ color: 'var(--color-resolved)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{selectedComplaint.resolution_notes}</div>
                </div>
              )}

              {/* Audit History Timeline */}
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-neutral-200)', paddingTop: '0.75rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--color-neutral-700)', marginBottom: '0.5rem' }}>Activity History</h4>
                {selectedComplaint.statusHistory?.map((h, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600)', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>• {h.notes} ({h.changed_by_name})</span>
                    <span style={{ color: 'var(--color-neutral-400)' }}>{new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>

              {/* Reopen Action for Resident */}
              {currentUser?.role === 'resident' && selectedComplaint.status === 'RESOLVED' && (
                <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-neutral-200)', paddingTop: '1rem' }}>
                  {!showReopenInput ? (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => setShowReopenInput(true)}
                    >
                      ⚠️ Issue Not Cleaned? Reopen Complaint
                    </button>
                  ) : (
                    <div>
                      <label className="form-label" htmlFor="reopen-reason-input">Reason for reopening:</label>
                      <input
                        id="reopen-reason-input"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Stains remain, odour not eliminated"
                        value={reopenReason}
                        onChange={(e) => setReopenReason(e.target.value)}
                        style={{ marginBottom: '0.5rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => handleReopenSubmit(selectedComplaint.id)}
                        >
                          Confirm Reopen
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setShowReopenInput(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: ASSIGN STAFF (MANAGER) */}
        {assignModalComplaint && (
          <div className="modal-overlay" onClick={() => setAssignModalComplaint(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-assign-title">
              <div className="modal-header">
                <h3 id="modal-assign-title">Assign Task to Housekeeping Staff</h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setAssignModalComplaint(null)}
                  title="Close modal"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', marginBottom: '1rem' }}>
                Ticket: <strong>{assignModalComplaint.reference_number}</strong> ({assignModalComplaint.wing} • {assignModalComplaint.floor_location})
              </p>

              {staffList.length === 0 ? (
                <div style={{ backgroundColor: 'var(--color-pending-bg)', border: '1px solid var(--color-pending-border)', color: 'var(--color-pending)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  ⚠️ <strong>No active housekeeping staff available.</strong> Please activate existing staff or add a new team member in <strong>Manage Staff</strong> before dispatching this complaint.
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="assign-staff-select">
                      Select Active Staff Member <span className="req">*</span>
                    </label>
                    <select
                      id="assign-staff-select"
                      className="form-select"
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                    >
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} {s.employee_id ? `(${s.employee_id})` : ''} • Current Tasks: {s.active_tasks_count}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="assign-instructions-input">
                      Special Directives / Instructions (Optional)
                    </label>
                    <input
                      id="assign-instructions-input"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Disinfect area and place fresh bin liner"
                      value={assignInstructions}
                      onChange={(e) => setAssignInstructions(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAssignModalComplaint(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={staffList.length === 0 || assigningLoading}
                  onClick={handleAssignSubmit}
                >
                  {assigningLoading ? 'Dispatching...' : 'Confirm & Dispatch Task'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD NEW STAFF (MANAGER) */}
        {addStaffModalOpen && (
          <div className="modal-overlay" onClick={() => setAddStaffModalOpen(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-add-staff-title">
              <div className="modal-header">
                <h3 id="modal-add-staff-title">Add New Housekeeping Staff</h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setAddStaffModalOpen(false)}
                  title="Close modal"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

              {addStaffError && (
                <div style={{ backgroundColor: 'var(--color-reopened-bg)', border: '1px solid var(--color-reopened-border)', color: 'var(--color-reopened)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  ⚠️ {addStaffError}
                </div>
              )}

              <form onSubmit={handleCreateStaffSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="add-staff-fullname">
                    Full Name <span className="req">*</span>
                  </label>
                  <input
                    id="add-staff-fullname"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Suresh Patil"
                    value={addStaffForm.fullName}
                    onChange={(e) => setAddStaffForm({ ...addStaffForm, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="add-staff-email">
                    Email Address <span className="req">*</span>
                  </label>
                  <input
                    id="add-staff-email"
                    type="email"
                    className="form-input"
                    placeholder="e.g. suresh.patil@greenvista.org"
                    value={addStaffForm.email}
                    onChange={(e) => setAddStaffForm({ ...addStaffForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="add-staff-phone">
                      Phone Number (Optional)
                    </label>
                    <input
                      id="add-staff-phone"
                      type="tel"
                      className="form-input"
                      placeholder="e.g. +91 98765 43210"
                      value={addStaffForm.phone}
                      onChange={(e) => setAddStaffForm({ ...addStaffForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="add-staff-empid">
                      Employee ID (Optional)
                    </label>
                    <input
                      id="add-staff-empid"
                      type="text"
                      className="form-input"
                      placeholder="e.g. HK-012"
                      value={addStaffForm.employeeId}
                      onChange={(e) => setAddStaffForm({ ...addStaffForm, employeeId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="add-staff-password">
                    Initial Password (Optional)
                  </label>
                  <input
                    id="add-staff-password"
                    type="text"
                    className="form-input"
                    placeholder="Leave blank to auto-generate a secure temporary password"
                    value={addStaffForm.initialPassword}
                    onChange={(e) => setAddStaffForm({ ...addStaffForm, initialPassword: e.target.value })}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', marginTop: '0.25rem' }}>
                    If blank, a random password will be generated and shown to you immediately.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setAddStaffModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={addStaffLoading}
                  >
                    {addStaffLoading ? 'Creating...' : 'Create Staff Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT STAFF (MANAGER) */}
        {editStaffModalOpen && (
          <div className="modal-overlay" onClick={() => setEditStaffModalOpen(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-edit-staff-title">
              <div className="modal-header">
                <h3 id="modal-edit-staff-title">Edit Staff Member Details</h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setEditStaffModalOpen(false)}
                  title="Close modal"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

              {editStaffError && (
                <div style={{ backgroundColor: 'var(--color-reopened-bg)', border: '1px solid var(--color-reopened-border)', color: 'var(--color-reopened)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  ⚠️ {editStaffError}
                </div>
              )}

              <form onSubmit={handleUpdateStaffSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-staff-fullname">
                    Full Name <span className="req">*</span>
                  </label>
                  <input
                    id="edit-staff-fullname"
                    type="text"
                    className="form-input"
                    value={editStaffForm.fullName}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-staff-email">
                    Email Address <span className="req">*</span>
                  </label>
                  <input
                    id="edit-staff-email"
                    type="email"
                    className="form-input"
                    value={editStaffForm.email}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-staff-phone">Phone Number</label>
                    <input
                      id="edit-staff-phone"
                      type="tel"
                      className="form-input"
                      value={editStaffForm.phone}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-staff-empid">Employee ID</label>
                    <input
                      id="edit-staff-empid"
                      type="text"
                      className="form-input"
                      value={editStaffForm.employeeId}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, employeeId: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setEditStaffModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={editStaffLoading}
                  >
                    {editStaffLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: RESOLVE WORK (STAFF) */}
        {resolveModalComplaint && (
          <div className="modal-overlay" onClick={() => setResolveModalComplaint(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-resolve-title">
              <div className="modal-header">
                <h3 id="modal-resolve-title">Complete & Verify Cleanup</h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setResolveModalComplaint(null)}
                  title="Close modal"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', marginBottom: '1rem' }}>
                Ref: <strong>{resolveModalComplaint.reference_number}</strong> ({resolveModalComplaint.wing} • {resolveModalComplaint.floor_location})
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="resolve-notes-input">
                  Completion Notes
                </label>
                <textarea
                  id="resolve-notes-input"
                  className="form-textarea"
                  rows="3"
                  placeholder="e.g. Garbage chute cleared, floor washed and bleached, fresh bin liner placed."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="resolve-photo-input">
                  Attach After-Cleanup Photo Proof (Optional, max 5MB)
                </label>
                {!resolvePhotoPreview ? (
                  <label className="file-upload-box" htmlFor="resolve-photo-input">
                    <div className="upload-icon" aria-hidden="true">📷</div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-primary-800)' }}>
                      Click to upload resolution evidence photo
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', marginTop: '0.2rem' }}>
                      Supports JPEG, PNG, WebP (up to 5MB)
                    </div>
                    <input
                      id="resolve-photo-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleResolvePhotoSelect}
                    />
                  </label>
                ) : (
                  <div className="file-preview-wrapper">
                    <img src={resolvePhotoPreview} alt="Cleanup proof preview" className="file-preview-img" />
                    <button
                      type="button"
                      className="btn-remove-preview"
                      onClick={() => {
                        setResolvePhoto(null);
                        setResolvePhotoPreview(null);
                      }}
                      title="Remove attached photo"
                      aria-label="Remove attached photo"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setResolveModalComplaint(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={resolvingLoading}
                  onClick={handleResolveSubmit}
                >
                  {resolvingLoading ? 'Marking...' : '✅ Mark as Resolved'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EDIT / ADD COLLECTION SCHEDULE (MANAGER) */}
        {scheduleModalOpen && (
          <div className="modal-overlay" onClick={() => setScheduleModalOpen(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-schedule-title">
              <div className="modal-header">
                <h3 id="modal-schedule-title">
                  {scheduleModalMode === 'create' ? 'Add Collection Schedule Slot' : 'Edit Collection Schedule'}
                </h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setScheduleModalOpen(false)}
                  title="Close modal"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

              {scheduleError && (
                <div style={{ backgroundColor: 'var(--color-reopened-bg)', border: '1px solid var(--color-reopened-border)', color: 'var(--color-reopened)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  ⚠️ {scheduleError}
                </div>
              )}

              <form onSubmit={handleSaveScheduleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="schedule-category-select">
                    Waste Category <span className="req">*</span>
                  </label>
                  <select
                    id="schedule-category-select"
                    className="form-select"
                    value={scheduleForm.wasteCategory}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, wasteCategory: e.target.value })}
                  >
                    <option value="WET_ORGANIC">🥬 Wet Organic Waste</option>
                    <option value="DRY_RECYCLABLE">📦 Dry Recyclable Waste</option>
                    <option value="E_WASTE_HAZARDOUS">🔋 E-Waste & Hazardous</option>
                    <option value="GARDEN_PRUNINGS">🌿 Garden & Tree Prunings</option>
                    <option value="BULKY_DOMESTIC">🛋️ Bulky Domestic Items</option>
                    <option value="SANITARY_WASTE">🧼 Sanitary & Medical Waste</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" id="schedule-days-label">
                    Collection Days <span className="req">*</span>
                  </label>
                  <div className="day-selector-grid" role="group" aria-labelledby="schedule-days-label">
                    {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => {
                      const isSel = scheduleForm.daysOfWeek.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`day-pill-btn ${isSel ? 'selected' : ''}`}
                          onClick={() => handleToggleScheduleDay(day)}
                          aria-pressed={isSel}
                        >
                          {day} {isSel ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="schedule-start-time">
                      Start Time (24h) <span className="req">*</span>
                    </label>
                    <input
                      id="schedule-start-time"
                      type="time"
                      className="form-input"
                      value={scheduleForm.startTime}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="schedule-end-time">
                      End Time (24h) <span className="req">*</span>
                    </label>
                    <input
                      id="schedule-end-time"
                      type="time"
                      className="form-input"
                      value={scheduleForm.endTime}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="schedule-location-input">
                    Disposal / Pickup Location (Optional)
                  </label>
                  <input
                    id="schedule-location-input"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Floor Chutes, Clubhouse Drop Point, Ground Refuse Room"
                    value={scheduleForm.disposalLocation}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, disposalLocation: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="schedule-instructions-input">
                    Resident Directives & Instructions
                  </label>
                  <textarea
                    id="schedule-instructions-input"
                    className="form-textarea"
                    rows="3"
                    placeholder="e.g. Place bins outside door before 7:45 AM. Ensure dry waste is tied."
                    value={scheduleForm.instructions}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, instructions: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setScheduleModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={scheduleLoading}
                  >
                    {scheduleLoading ? 'Saving...' : scheduleModalMode === 'create' ? 'Create Schedule' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="toast" role="status" aria-live="polite">
            <span aria-hidden="true">ℹ️</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}
