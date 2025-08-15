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
	X
} from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
	const location = useLocation();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const navigation = [
		{ name: 'Dashboard', href: '/', icon: Home },
		{ name: 'จัดการล็อต', href: '/batches', icon: Package },
		{ name: 'ตวงวัตถุดิบ', href: '/weighing', icon: Scale },
		{ name: 'ผลผลิต', href: '/production', icon: Factory },
		{ name: 'คำนวณต้นทุน', href: '/costs', icon: Calculator },
		{ name: 'รายงาน', href: '/reports', icon: BarChart3 },
		{ name: 'Logs การผลิต', href: '/logs', icon: Database },
	];

	const isActive = (path) => location.pathname === path;

	return (
		<nav className="bg-white shadow-sm border-b border-gray-200">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					<div className="flex items-center">
						<div className="flex-shrink-0 flex items-center">
							<Factory className="h-8 w-8 text-primary-600" />
							<span className="ml-2 text-xl font-semibold text-gray-900">
								ระบบคำนวณต้นทุนการผลิต
							</span>
						</div>
						{/* ปุ่มทดสอบ Logs แยกต่างหาก */}
						<Link
							to="/logs-test"
							className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
						>
							ทดสอบ Logs
						</Link>
					</div>

					{/* Desktop Navigation */}
					<div className="hidden md:flex md:items-center md:space-x-4">
						{navigation.map((item) => {
							const Icon = item.icon;
							return (
								<Link
									key={item.name}
									to={item.href}
									className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
										isActive(item.href)
											? 'bg-primary-100 text-primary-700'
											: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
									}`}
								>
									<div className="flex items-center">
										<Icon className="h-4 w-4 mr-2" />
										{item.name}
									</div>
								</Link>
							);
						})}
					</div>

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

			{/* Mobile Navigation */}
			{isMobileMenuOpen && (
				<div className="md:hidden">
					<div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
						{navigation.map((item) => {
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
