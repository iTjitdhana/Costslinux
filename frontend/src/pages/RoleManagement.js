import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-hot-toast';
import { 
    Save, 
    Eye, 
    Plus, 
    Trash2, 
    Settings,
    Check,
    X
} from 'lucide-react';
import { costAPI } from '../services/api';
import { getPageTitle } from '../config/pageTitles';

const RoleManagement = () => {
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [newRole, setNewRole] = useState({
        role_name: '',
        display_name: '',
        color: 'blue',
        url_prefix: '/',
        menu_items: []
    });

    // Update URL prefix when role_name changes
    const updateUrlPrefix = (roleName) => {
        if (roleName) {
            setNewRole(prev => ({
                ...prev,
                role_name: roleName,
                url_prefix: `/${roleName.toLowerCase()}/`
            }));
        } else {
            setNewRole(prev => ({
                ...prev,
                role_name: roleName,
                url_prefix: '/'
            }));
        }
    };

    // All available menu items
    const allMenuItems = [
        { name: 'Dashboard', href: '/', icon: '🏠' },
        { name: 'จัดการล็อต', href: '/batches', icon: '📦' },
        { name: 'ตวงวัตถุดิบ', href: '/weighing', icon: '⚖️' },
        { name: 'ผลผลิต', href: '/production', icon: '🏭' },
        { name: 'คำนวณต้นทุน', href: '/costs', icon: '🧮' },
        { name: 'รายงาน', href: '/reports', icon: '📊' },
        { name: 'รายงานวิเคราะห์ต้นทุน', href: '/cost-analysis', icon: '📈' },
        { name: 'ข้อมูล Inventory', href: '/inventory', icon: '🗄️' },
        { name: 'Logs การผลิต', href: '/logs', icon: '📋' },
        { name: 'Conversion Rates', href: '/conversion-rates', icon: '⚙️' },
        { name: 'จัดการค่าแปลง', href: '/material-conversion-rates', icon: '🔧' }
    ];

    const colorOptions = [
        { value: 'blue', label: 'Blue', class: 'bg-blue-100 text-blue-800' },
        { value: 'red', label: 'Red', class: 'bg-red-100 text-red-800' },
        { value: 'green', label: 'Green', class: 'bg-green-100 text-green-800' },
        { value: 'yellow', label: 'Yellow', class: 'bg-yellow-100 text-yellow-800' },
        { value: 'purple', label: 'Purple', class: 'bg-purple-100 text-purple-800' },
        { value: 'gray', label: 'Gray', class: 'bg-gray-100 text-gray-800' }
    ];

    // Load roles from database
    const loadRoles = async () => {
        try {
            setIsLoading(true);
            const response = await costAPI.getRoles();
            console.log('Loaded roles:', response.data);
            setRoles(response.data);
            if (response.data.length > 0 && !selectedRole) {
                setSelectedRole(response.data[0]);
            }
        } catch (error) {
            console.error('Error loading roles:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Save role configuration
    const saveRole = async () => {
        if (!selectedRole) return;
        
        try {
            setIsSaving(true);
            await costAPI.updateRole(selectedRole.id, selectedRole);
            await loadRoles(); // Reload to get updated data
            alert('บันทึกการตั้งค่าเรียบร้อย');
        } catch (error) {
            console.error('Error saving role:', error);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSaving(false);
        }
    };

    // Create new role
    const createRole = async () => {
        if (!newRole.role_name || !newRole.display_name) {
            alert('กรุณากรอกชื่อ Role และชื่อที่แสดง');
            return;
        }

        // Check if URL prefix already exists
        const existingRole = roles.find(role => role.url_prefix === newRole.url_prefix);
        if (existingRole) {
            alert(`URL Prefix "${newRole.url_prefix}" มีอยู่แล้ว กรุณาใช้ URL Prefix อื่น`);
            return;
        }

        try {
            setIsSaving(true);
            console.log('Creating role:', newRole);
            const response = await costAPI.createRole(newRole);
            console.log('Created role response:', response.data);
            await loadRoles();
            setNewRole({
                role_name: '',
                display_name: '',
                color: 'blue',
                url_prefix: '/',
                menu_items: []
            });
            alert('สร้าง Role ใหม่เรียบร้อย');
        } catch (error) {
            console.error('Error creating role:', error);
            alert('เกิดข้อผิดพลาดในการสร้าง Role');
        } finally {
            setIsSaving(false);
        }
    };

    // Delete role
    const deleteRole = async (roleId) => {
        if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบ Role นี้?')) return;

        try {
            await costAPI.deleteRole(roleId);
            await loadRoles();
            if (selectedRole?.id === roleId) {
                setSelectedRole(null);
            }
            alert('ลบ Role เรียบร้อย');
        } catch (error) {
            console.error('Error deleting role:', error);
            alert('เกิดข้อผิดพลาดในการลบ Role');
        }
    };

    // Toggle menu item
    const toggleMenuItem = (menuName) => {
        if (!selectedRole) return;

        const updatedMenuItems = selectedRole.menu_items.includes(menuName)
            ? selectedRole.menu_items.filter(item => item !== menuName)
            : [...selectedRole.menu_items, menuName];

        setSelectedRole({
            ...selectedRole,
            menu_items: updatedMenuItems
        });
    };

    // Select all menu items
    const selectAllMenus = () => {
        if (!selectedRole) return;
        setSelectedRole({
            ...selectedRole,
            menu_items: allMenuItems.map(item => item.name)
        });
    };

    // Clear all menu items
    const clearAllMenus = () => {
        if (!selectedRole) return;
        setSelectedRole({
            ...selectedRole,
            menu_items: []
        });
    };

    useEffect(() => {
        loadRoles();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <Helmet>
                				<title>{getPageTitle('roleManagement')}</title>
            </Helmet>
            <div className="bg-white shadow-sm rounded-lg">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">จัดการ Role และเมนู</h1>
                            <p className="text-gray-600">กำหนดสิทธิ์การเข้าถึงเมนูสำหรับแต่ละ Role</p>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                    {/* Role List */}
                    <div className="lg:col-span-1">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Role List</h3>
                            
                            {/* Create New Role */}
                            <div className="mb-4 p-3 bg-white rounded border">
                                <h4 className="font-medium text-gray-700 mb-2">สร้าง Role ใหม่</h4>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="ชื่อ Role (เช่น: planner)"
                                        value={newRole.role_name}
                                        onChange={(e) => updateUrlPrefix(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="ชื่อที่แสดง (เช่น: Planner)"
                                        value={newRole.display_name}
                                        onChange={(e) => setNewRole({...newRole, display_name: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="URL Prefix (เช่น: /planner/)"
                                        value={newRole.url_prefix}
                                        onChange={(e) => setNewRole({...newRole, url_prefix: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                    <select
                                        value={newRole.color}
                                        onChange={(e) => setNewRole({...newRole, color: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    >
                                        {colorOptions.map(color => (
                                            <option key={color.value} value={color.value}>
                                                {color.label}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={createRole}
                                        disabled={isSaving}
                                        className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        สร้าง Role
                                    </button>
                                </div>
                            </div>

                            {/* Existing Roles */}
                            <div className="space-y-2">
                                {roles.map((role) => (
                                    <div
                                        key={role.id}
                                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                            selectedRole?.id === role.id
                                                ? 'bg-primary-100 border-primary-300 border'
                                                : 'bg-white hover:bg-gray-100 border border-gray-200'
                                        }`}
                                        onClick={() => setSelectedRole(role)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                    colorOptions.find(c => c.value === role.color)?.class || 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {role.display_name}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteRole(role.id);
                                                }}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {role.url_prefix}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Role Configuration */}
                    <div className="lg:col-span-2">
                        {selectedRole ? (
                            <div className="bg-white rounded-lg border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">
                                                ตั้งค่า Role: {selectedRole.display_name}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                URL: {selectedRole.url_prefix}
                                            </p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={saveRole}
                                                disabled={isSaving}
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                                            >
                                                <Save className="h-4 w-4 mr-2" />
                                                {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {/* Role Settings */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                ชื่อที่แสดง
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedRole.display_name}
                                                onChange={(e) => setSelectedRole({
                                                    ...selectedRole,
                                                    display_name: e.target.value
                                                })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                สี
                                            </label>
                                            <select
                                                value={selectedRole.color}
                                                onChange={(e) => setSelectedRole({
                                                    ...selectedRole,
                                                    color: e.target.value
                                                })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            >
                                                {colorOptions.map(color => (
                                                    <option key={color.value} value={color.value}>
                                                        {color.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                URL Prefix
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedRole.url_prefix}
                                                onChange={(e) => setSelectedRole({
                                                    ...selectedRole,
                                                    url_prefix: e.target.value
                                                })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                    </div>

                                    {/* Menu Selection */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-lg font-medium text-gray-900">
                                                เลือกเมนูที่แสดง
                                            </h4>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={selectAllMenus}
                                                    className="text-sm text-primary-600 hover:text-primary-800"
                                                >
                                                    เลือกทั้งหมด
                                                </button>
                                                <button
                                                    onClick={clearAllMenus}
                                                    className="text-sm text-gray-600 hover:text-gray-800"
                                                >
                                                    ล้างทั้งหมด
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {allMenuItems.map((item) => (
                                                <label
                                                    key={item.name}
                                                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRole.menu_items.includes(item.name)}
                                                        onChange={() => toggleMenuItem(item.name)}
                                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                                    />
                                                    <span className="ml-3 text-sm font-medium text-gray-900">
                                                        {item.icon} {item.name}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-lg p-8 text-center">
                                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    เลือก Role เพื่อตั้งค่า
                                </h3>
                                <p className="text-gray-500">
                                    เลือก Role จากรายการด้านซ้ายเพื่อเริ่มตั้งค่าเมนู
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview */}
                {showPreview && selectedRole && (
                    <div className="mt-6 bg-white border border-gray-200 rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">Preview</h3>
                        </div>
                        <div className="p-6">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-lg font-semibold">ระบบจัดการแผนการผลิตครัวกลาง</span>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                            colorOptions.find(c => c.value === selectedRole.color)?.class || 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {selectedRole.display_name}
                                        </span>
                                    </div>
                                    <button className="text-gray-600 hover:text-gray-800">
                                        ☰
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedRole.menu_items.map((menuName) => {
                                        const menuItem = allMenuItems.find(item => item.name === menuName);
                                        return (
                                            <span
                                                key={menuName}
                                                className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm"
                                            >
                                                {menuItem?.icon} {menuName}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoleManagement;
