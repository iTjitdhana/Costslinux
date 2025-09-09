import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
	Home, 
	Package, 
	Scale, 
	Factory, 
	Calculator, 
	BarChart3,
	Database,
	Menu,
	X,
	Settings
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { costAPI } from '../services/api';

const Navbar = () => {
	const location = useLocation();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
	const [currentRole, setCurrentRole] = useState(null);
	const [loading, setLoading] = useState(true);

	const navigation = [
		{ name: 'Dashboard', href: '/', icon: Home, adminOnly: false },
		{ name: 'จัดการล็อต', href: '/admin/batches', icon: Package, adminOnly: true },
		{ name: 'ตวงวัตถุดิบ', href: '/admin/weighing', icon: Scale, adminOnly: true },
		{ name: 'ผลผลิต', href: '/admin/production', icon: Factory, adminOnly: true },
		{ name: 'คำนวณต้นทุน', href: '/admin/costs', icon: Calculator, adminOnly: true },
		{ name: 'รายงาน', href: '/admin/reports', icon: BarChart3, adminOnly: true },
		{ name: 'รายงานวิเคราะห์ต้นทุน', href: '/admin/cost-analysis', icon: BarChart3, adminOnly: false },
		{ name: 'ข้อมูล Inventory', href: '/admin/inventory', icon: Database, adminOnly: true },
		{ name: 'Logs การผลิต', href: '/planner/logs', icon: Database, adminOnly: false },
		{ name: 'Conversion Rates', href: '/admin/conversion-rates', icon: Settings, adminOnly: true },
		{ name: 'จัดการค่าแปลง', href: '/admin/material-conversion-rates', icon: Settings, adminOnly: true },
		{ name: 'จัดการ Role', href: '/superadmin/role-management', icon: Settings, adminOnly: true },
	];

	// Get current role based on URL path
	const getCurrentRole = async () => {
		try {
			setLoading(true);
			const path = location.pathname;
			let urlPrefix = '/';
			
			// Extract URL prefix from current path
			if (path.startsWith('/admin/')) {
				urlPrefix = '/admin/';
			} else if (path.startsWith('/adminOperation/')) {
				urlPrefix = '/adminOperation/';
			} else if (path.startsWith('/planner/')) {
				urlPrefix = '/planner/';
			} else if (path.startsWith('/operator/')) {
				urlPrefix = '/operator/';
			} else if (path.startsWith('/viewer/')) {
				urlPrefix = '/viewer/';
			} else if (path.startsWith('/superadmin/')) {
				urlPrefix = '/superadmin/';
			} else if (path.startsWith('/Operation/')) {
				urlPrefix = '/Operation/';
			} else {
				// สำหรับ role อื่นๆ ที่อาจมีในอนาคต
				const pathParts = path.split('/');
				if (pathParts.length > 1 && pathParts[1]) {
					urlPrefix = `/${pathParts[1]}/`;
				}
			}
			
			// Fetch role configuration
			const response = await costAPI.getRoleByUrl(urlPrefix);
			setCurrentRole(response.data);
		} catch (error) {
			console.error('Error fetching role:', error);
			// Fallback to default behavior
			setCurrentRole(null);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		getCurrentRole();
	}, [location.pathname]);

		// Check if current path is admin mode
		const isAdminMode = location.pathname.startsWith('/admin') || 
							location.pathname.startsWith('/adminOperation') ||
							location.pathname.startsWith('/superadmin') || 
							location.pathname.startsWith('/Operation') ||
							location.pathname.startsWith('/Operation/');
	
	// Filter navigation based on role permissions and create proper hrefs
	const visibleNavigation = navigation.filter((item) => {
		// If no role is loaded yet, use fallback logic
		if (!currentRole || loading) {
			if (isAdminMode) {
				return true;
			} else {
				return !item.adminOnly;
			}
		}
		
		// Check if item is in the role's menu_items
		const allowedMenus = currentRole.menu_items || [];
		return allowedMenus.includes(item.name);
	}).map((item) => {
		// Create proper href based on current role and menu item
		let href = item.href;
		
		if (currentRole && currentRole.url_prefix) {
			// Define which menus should use which URL patterns
			const menuUrlMap = {
				'Dashboard': '/',
				'จัดการล็อต': '/batches',
				'ตวงวัตถุดิบ': '/weighing', 
				'ผลผลิต': '/production',
				'คำนวณต้นทุน': '/costs',
				'รายงาน': '/reports',
				'รายงานวิเคราะห์ต้นทุน': '/cost-analysis',
				'ข้อมูล Inventory': '/inventory',
				'Logs การผลิต': '/logs',
				'Conversion Rates': '/conversion-rates',
				'จัดการค่าแปลง': '/material-conversion-rates',
				'จัดการ Role': '/role-management'
			};
			
			// Get the base path for this menu item
			const basePath = menuUrlMap[item.name] || '/';
			
			// Create the full URL with role prefix
			if (basePath === '/') {
				// Dashboard goes to role root
				href = currentRole.url_prefix;
			} else {
				// Other menus go to role prefix + base path (remove leading slash from basePath)
				const cleanBasePath = basePath.startsWith('/') ? basePath.substring(1) : basePath;
				href = currentRole.url_prefix + cleanBasePath;
			}
		}
		
		return { ...item, href };
	});

	const isActive = (path) => location.pathname === path;

	return (
		<nav className="bg-white shadow-sm border-b border-gray-200">
			<div className="w-full px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					<div className="flex items-center relative">
						<div className="flex-shrink-0 flex items-center">
							<Factory className="h-8 w-8 text-primary-600" />
							<span className="ml-2 text-xl font-semibold text-gray-900">ระบบจัดการแผนการผลิตครัวกลาง บริษัท จิตต์ธนา จำกัด (สำนักงานใหญ่) - Back Office</span>
							{currentRole && (
								<span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${
									currentRole.url_prefix === '/admin/' || currentRole.url_prefix === '/adminOperation/' || currentRole.url_prefix === '/superadmin/' || currentRole.url_prefix === '/Operation/'
										? 'bg-red-100 text-red-800'
										: 'bg-blue-100 text-blue-800'
								}`}>
									{currentRole.display_name}
								</span>
							)}
						</div>
					</div>

					{/* Right side: desktop hamburger + mobile button */}
					<div className="flex items-center relative">
						{/* Desktop hamburger */}
						<div className="hidden md:block">
							<button
								onClick={() => setIsDesktopMenuOpen((v) => !v)}
								className="inline-flex items-center justify-center px-2 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
								aria-label="Open menu"
							>
								<Menu className="h-6 w-6" />
							</button>
							{isDesktopMenuOpen && (
								<div className="absolute top-12 right-0 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
									<div className="py-2">
										{visibleNavigation.map((item) => {
											const Icon = item.icon;
											return (
												<Link
													key={item.name}
													to={item.href}
													onClick={() => setIsDesktopMenuOpen(false)}
													className={`flex items-center px-3 py-2 text-sm transition-colors duration-200 ${
													isActive(item.href)
														? 'bg-primary-50 text-primary-700'
														: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
													}`}
												>
													<Icon className="h-4 w-4 mr-2" />
													<span className="truncate">{item.name}</span>
												</Link>
											);
										})}
									</div>
								</div>
							)}

							{/* Mobile menu button */}
							<div className="md:hidden flex items-center">
								<button
									onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
									className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
								>
									{isMobileMenuOpen ? (
										<X className="h-6 w-6" />
									) : (
										<Menu className="h-6 w-6" />
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
				</div>
 
				{/* Mobile Navigation */}
				{isMobileMenuOpen && (
					<div className="md:hidden">
						<div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
							{visibleNavigation.map((item) => {
								const Icon = item.icon;
								return (
									<Link
										key={item.name}
										to={item.href}
										onClick={() => setIsMobileMenuOpen(false)}
										className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
											isActive(item.href)
												? 'bg-primary-100 text-primary-700'
												: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
										}`}
									>
										<div className="flex items-center">
											<Icon className="h-5 w-5 mr-3" />
											{item.name}
										</div>
									</Link>
								);
							})}
						</div>
					</div>
				)}
			</nav>
	);
};

export default Navbar;
