import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { api } from "../../lib/api";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  User,
  Mail,
  Building,
  Shield,
  Eye,
  EyeOff,
  ChevronDown,
  Download,
} from "lucide-react";
import SkeletonLoader from "../../components/SkeletonLoader";
import UserExportModal from "../../components/UserExportModal";

const AdminUsers = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [highlightedRole, setHighlightedRole] = useState(null); // "all", "admin", "procurement", "user"
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    category: "ob",
  });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const getRoleColor = (role, category) => {
    if (role === "super_admin") return "bg-red-200 text-red-900";
    if (role === "admin_ga_manager") return "bg-orange-100 text-orange-800";
    if (role === "admin_ga") return "bg-yellow-100 text-yellow-800";
    if (role === "procurement") return "bg-blue-100 text-blue-800";
    if (role === "user") {
      if (category === "driver") return "bg-blue-100 text-blue-800";
      if (category === "security") return "bg-purple-100 text-purple-800";
      if (category === "ob") return "bg-green-100 text-green-800";
      if (category === "magang_pkl") return "bg-indigo-100 text-indigo-800";
      return "bg-gray-100 text-gray-800";
    }
    return "bg-gray-100 text-gray-800";
  };

  const getRoleIcon = (role, category) => {
    if (role === "super_admin") return <Shield className="h-4 w-4 text-red-800" />;
    if (role === "admin_ga_manager") return <Shield className="h-4 w-4 text-orange-600" />;
    if (role === "admin_ga") return <Shield className="h-4 w-4 text-yellow-600" />;
    if (role === "procurement") return <Building className="h-4 w-4 text-blue-600" />;
    if (role === "user") {
      if (category === "driver")
        return <Building className="h-4 w-4 text-blue-600" />;
      if (category === "security")
        return <Shield className="h-4 w-4 text-purple-600" />;
      if (category === "ob") return <User className="h-4 w-4 text-green-600" />;
      if (category === "magang_pkl") return <User className="h-4 w-4 text-indigo-600" />;
      return <User className="h-4 w-4 text-gray-600" />;
    }
    return <User className="h-4 w-4 text-gray-600" />;
  };

  const getRoleAvatarBg = (role) => {
    switch (role) {
      case "super_admin":
        return "bg-red-200";
      case "admin_ga_manager":
        return "bg-orange-100";
      case "admin_ga":
        return "bg-yellow-100";
      case "procurement":
        return "bg-blue-100";
      case "user":
        return "bg-green-100";
      default:
        return "bg-gray-100";
    }
  };

  const getRoleDisplayName = (role, category) => {
    if (role === "super_admin") return "Super Admin";
    if (role === "admin_ga_manager") return "GA Manager";
    if (role === "admin_ga") return "Admin GA";
    if (role === "procurement") return "Procurement";
    if (role === "user") {
      if (category === "driver") return "Driver";
      if (category === "security") return "Security";
      if (category === "ob") return "OB";
      if (category === "magang_pkl") return "Magang/PKL";
      return "User";
    }
    return role;
  };

  const getRoleOnlyDisplayName = (role, category) => {
    if (role === "super_admin") return "Super Admin";
    if (role === "admin_ga_manager") return "GA Manager";
    if (role === "admin_ga") return "Admin GA";
    if (role === "procurement") return "Procurement";
    // For normal users, show: "Employee - OB/Driver/Security/Magang-PKL" (or trailing hyphen if not set yet)
    const cat = getCategoryDisplayName(category);
    return cat ? `Employee - ${cat}` : "Employee";
  };

  const getCategoryDisplayName = (category) => {
    if (category === "driver") return "Driver";
    if (category === "security") return "Security";
    if (category === "ob") return "OB";
    if (category === "magang_pkl") return "Magang/PKL";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        category: formData.category,
      };

      if (!editingUser) {
        payload.password = formData.password; // required by backend on create
        await api.post("/users", payload);
      } else {
        if (formData.password) payload.password = formData.password; // optional on update
        await api.patch(`/users/${editingUser.id}`, payload);
      }
      const res = await api.get("/users");
      setUsers(res.data || []);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "user",
        category: "ob",
      });
      setShowModal(false);
      setEditingUser(null);
    } catch (e) {
      alert(e?.response?.data?.message || t("users.saveFailed"));
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      category: user.category || "ob",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("users.deleteConfirm"))) return;
    try {
      await api.delete(`/users/${id}`);
      const res = await api.get("/users");
      setUsers(res.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || t("users.deleteFailed"));
    }
  };

  const filteredUsers = users.filter((user) => {
    // Filter berdasarkan role
    const roleMatch = roleFilter === "all" || user.role === roleFilter;

    // Filter berdasarkan search term (name, email, department, join date)
    const searchMatch =
      !searchTerm ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.created_at &&
        new Date(user.created_at).toLocaleDateString().includes(searchTerm));

    return roleMatch && searchMatch;
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/users");
        if (!cancelled) setUsers(res.data || []);
      } catch (e) {
        if (!cancelled)
          setError(e?.response?.data?.message || t("users.loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  // Auto-detect role from search results
  useEffect(() => {
    if (!searchTerm) {
      setHighlightedRole(null);
      return;
    }

    // Get the roles of users that match the search term
    const matchingRoles = filteredUsers.map((user) => user.role);
    const uniqueRoles = [...new Set(matchingRoles)];

    // If only one role type is found, highlight that role card
    if (uniqueRoles.length === 1) {
      setHighlightedRole(uniqueRoles[0]);
    } else {
      // If multiple roles or no matches, don't highlight any specific role
      setHighlightedRole(null);
    }
  }, [searchTerm, filteredUsers]);

  // Reset form state when modal opens for Add New User
  useEffect(() => {
    if (showModal && !editingUser) {
      setShowPassword(false);
      setShowRoleDropdown(false);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "user",
        category: "ob",
      });
    }
  }, [showModal, editingUser]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showRoleDropdown) {
        const dropdownElement = document.querySelector(
          '[data-dropdown="role"]'
        );
        if (dropdownElement && !dropdownElement.contains(event.target)) {
          setShowRoleDropdown(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showRoleDropdown]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {t("users.title")}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {t("users.subtitle")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Export Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="btn-secondary w-full sm:w-auto flex items-center justify-center"
          >
            <Download className="h-4 w-4 mr-2" />
            {t("users.exportUsers", { defaultValue: "Export Users" })}
          </button>
          {/* Add New User Button */}
          <button
            onClick={() => {
              // Reset all states first
              setEditingUser(null);
              setShowPassword(false);
              setShowRoleDropdown(false);
              setFormData({
                name: "",
                email: "",
                password: "",
                role: "user",
                department: "",
                position: "",
              });
              // Then open modal
              setShowModal(true);
            }}
            className="btn-primary w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("users.addNewUser")}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={t("users.searchUsers")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 text-gray-900"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
            <SkeletonLoader type="stats" />
          </>
        ) : (
          <>
            <div
              className={`card cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 ${
                roleFilter === "all" && !highlightedRole
                  ? "ring-2 ring-blue-500 bg-blue-50"
                  : ""
              }`}
              onClick={() => {
                setRoleFilter("all");
                setHighlightedRole(null);
              }}
            >
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <User className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        {t("users.totalUsers")}
                      </dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">
                        {users.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`card cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 ${
                roleFilter === "admin_ga"
                  ? "ring-2 ring-yellow-500 bg-yellow-50"
                  : highlightedRole === "admin_ga"
                  ? "ring-2 ring-yellow-300 bg-yellow-25"
                  : ""
              }`}
              onClick={() => {
                setRoleFilter("admin_ga");
                setHighlightedRole(null);
              }}
            >
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        Admin GA
                      </dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">
                        {users.filter((u) => u.role === "admin_ga").length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`card cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 ${
                roleFilter === "admin_ga_manager"
                  ? "ring-2 ring-orange-500 bg-orange-50"
                  : highlightedRole === "admin_ga_manager"
                  ? "ring-2 ring-orange-300 bg-orange-25"
                  : ""
              }`}
              onClick={() => {
                setRoleFilter("admin_ga_manager");
                setHighlightedRole(null);
              }}
            >
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        GA Manager
                      </dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">
                        {users.filter((u) => u.role === "admin_ga_manager").length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-105 ${
                highlightedRole === "procurement" ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => {
                setRoleFilter("procurement");
                setHighlightedRole("procurement");
              }}
            >
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        Procurement
                      </dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">
                        {users.filter((u) => u.role === "procurement").length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`card cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200 ${
                roleFilter === "user"
                  ? "ring-2 ring-green-500 bg-green-50"
                  : highlightedRole === "user"
                  ? "ring-2 ring-green-300 bg-green-25"
                  : ""
              }`}
              onClick={() => {
                setRoleFilter("user");
                setHighlightedRole(null);
              }}
            >
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <User className="h-6 w-6 sm:h-8 sm:w-8 text-gray-500" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        {t("users.employees")}
                      </dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">
                        {users.filter((u) => u.role === "user").length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Users Table */}
      <div className="card">
        {loading ? (
          <SkeletonLoader type="list" lines={5} />
        ) : error ? (
          <div className="px-6 py-4 text-sm text-red-600">{error}</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.map((user) => (
              <li key={user.id} className="px-3 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                    <div className="flex-shrink-0">
                      <div
                        className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full ${getRoleAvatarBg(
                          user.role
                        )} flex items-center justify-center`}
                      >
                        {getRoleIcon(user.role, user.category)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {user.name}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(
                            user.role,
                            user.category
                          )}`}
                        >
                          {getRoleOnlyDisplayName(user.role, user.category)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        {/* Category chip removed; combined in the role chip above for users */}
                        <span className="text-xs">
                          Joined:{" "}
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end sm:justify-start space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDetailModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title={t("users.viewDetails")}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-accent-600 hover:text-accent-800"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal */}
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 modal-overlay bg-gray-900/50 backdrop-blur-[1px] z-[1000]"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div className="relative z-10 flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-2xl p-6 border border-gray-200 shadow-lg rounded-lg bg-white transform transition-all duration-300 ease-out animate-in slide-in-from-top-4 fade-in-0 zoom-in-95">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
                    {editingUser ? t("users.editUser") : t("users.createUser")}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("users.fullName")}
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              name: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-300 ease-in-out hover:border-gray-400 hover:shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("users.email")}
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              email: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-300 ease-in-out hover:border-gray-400 hover:shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("users.role")}
                        </label>
                        <div className="relative" data-dropdown="role">
                          <button
                            type="button"
                            onClick={() =>
                              setShowRoleDropdown(!showRoleDropdown)
                            }
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 bg-white cursor-pointer hover:border-gray-400 hover:shadow-sm transition-all duration-300 ease-in-out shadow-sm text-left"
                          >
                            {formData.role === "user" && t("users.employee")}
                            {formData.role === "admin_ga" && "Admin GA"}
                            {formData.role === "admin_ga_manager" && "GA Manager"}
                            {formData.role === "procurement" && "Procurement"}
                          </button>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <ChevronDown className="h-4 w-4 text-gray-500 transition-colors duration-300 ease-in-out" />
                          </div>

                          {/* Custom Dropdown List */}
                          {showRoleDropdown && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      role: "user",
                                      category: formData.category || "ob",
                                    });
                                    setShowRoleDropdown(false);
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors duration-200 ${
                                    formData.role === "user"
                                      ? "bg-blue-100 text-blue-700"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {t("users.employee")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      role: "admin_ga",
                                      category: "",
                                    });
                                    setShowRoleDropdown(false);
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors duration-200 ${
                                    formData.role === "admin_ga"
                                      ? "bg-blue-100 text-blue-700"
                                      : "text-gray-700"
                                  }`}
                                >
                                  Admin GA
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      role: "admin_ga_manager",
                                      category: "",
                                    });
                                    setShowRoleDropdown(false);
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors duration-200 ${
                                    formData.role === "admin_ga_manager"
                                      ? "bg-blue-100 text-blue-700"
                                      : "text-gray-700"
                                  }`}
                                >
                                  GA Manager
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      role: "procurement",
                                      category: "",
                                    });
                                    setShowRoleDropdown(false);
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors duration-200 ${
                                    formData.role === "procurement"
                                      ? "bg-blue-100 text-blue-700"
                                      : "text-gray-700"
                                  }`}
                                >
                                  Procurement
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {formData.role === "user" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {`${t("users.employee")} ${t("common.type")}`}
                          </label>
                          <select
                            value={formData.category || "ob"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                category: e.target.value,
                              })
                            }
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                          >
                            <option value="ob">{t("common.employeeTypes.ob")}</option>
                            <option value="driver">{t("common.employeeTypes.driver")}</option>
                            <option value="security">{t("common.employeeTypes.security")}</option>
                            <option value="magang_pkl">{t("common.employeeTypes.magang_pkl")}</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t("users.password")}
                          {!editingUser && ` (${t("users.required")})`}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required={!editingUser}
                            value={formData.password}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                password: e.target.value,
                              })
                            }
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-300 ease-in-out hover:border-gray-400 hover:shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-300 ease-in-out"
                          >
                            {showPassword ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          setEditingUser(null);
                          setShowPassword(false);
                          setShowRoleDropdown(false);
                          setFormData({
                            name: "",
                            email: "",
                            password: "",
                            role: "user",
                            category: "ob",
                          });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {t("common.cancel")}
                      </button>
                      <button type="submit" className="btn-primary px-4 py-2">
                        {editingUser
                          ? t("common.update")
                          : t("users.createUser")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Detail Modal */}
      {showDetailModal &&
        selectedUser &&
        createPortal(
          <div
            className="fixed inset-0 modal-overlay bg-gray-900/50 backdrop-blur-[1px] z-[1000]"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div className="relative z-10 flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-2xl p-6 border border-gray-200 shadow-lg rounded-lg bg-white transform transition-all duration-300 ease-out animate-in slide-in-from-top-4 fade-in-0 zoom-in-95">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
                    {t("users.employeeDetail")}
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div>
                      <strong>{t("users.name")}:</strong> {selectedUser.name}
                    </div>
                    <div>
                      <strong>{t("users.email")}:</strong> {selectedUser.email}
                    </div>
                    <div>
                      <strong>{t("users.role")}:</strong>{" "}
                      {getRoleDisplayName(
                        selectedUser.role,
                        selectedUser.category
                      )}
                    </div>
                    <div>
                      <strong>{t("common.category")}:</strong>{" "}
                      {selectedUser.role === "user"
                        ? getRoleDisplayName("user", selectedUser.category)
                        : "-"}
                    </div>
                    <div>
                      <strong>{t("users.joined")}:</strong>{" "}
                      {new Date(selectedUser.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowDetailModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t("common.close")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* User Export Modal */}
        <UserExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          users={users}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          selectedUsers={[]}
          user={null}
        />
    </div>
  );
};

export default AdminUsers;
