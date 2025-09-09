import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import BatchManagement from './pages/BatchManagement';
import MaterialWeighing from './pages/MaterialWeighing';
import ProductionResults from './pages/ProductionResults';
import CostCalculation from './pages/CostCalculation';
import CostReports from './pages/CostReports';
import CostAnalysisReport from './pages/CostAnalysisReport';
import LogsTest from './pages/LogsTest';
import FGConversionRates from './pages/FGConversionRates';
import MaterialConversionRates from './pages/MaterialConversionRates';
import InventoryData from './pages/InventoryData';
import RoleManagement from './pages/RoleManagement';
import { costAPI } from './services/api';

function App() {
	const [roles, setRoles] = useState([]);
	const [isLoading, setIsLoading] = useState(true);

	// Load roles from API
	useEffect(() => {
		const loadRoles = async () => {
			try {
				const response = await costAPI.getRoles();
				setRoles(response.data);
			} catch (error) {
				console.error('Error loading roles:', error);
			} finally {
				setIsLoading(false);
			}
		};
		loadRoles();
	}, []);

	// Generate dynamic routes for each role
	const generateRoleRoutes = (role) => {
		const urlPrefix = role.url_prefix.replace(/\/$/, ''); // Remove trailing slash
		return [
			<Route key={`${urlPrefix}-dashboard`} path={`${urlPrefix}/`} element={<Dashboard />} />,
			<Route key={`${urlPrefix}-batches`} path={`${urlPrefix}/batches`} element={<BatchManagement />} />,
			<Route key={`${urlPrefix}-weighing`} path={`${urlPrefix}/weighing`} element={<MaterialWeighing />} />,
			<Route key={`${urlPrefix}-production`} path={`${urlPrefix}/production`} element={<ProductionResults />} />,
			<Route key={`${urlPrefix}-costs`} path={`${urlPrefix}/costs`} element={<CostCalculation />} />,
			<Route key={`${urlPrefix}-reports`} path={`${urlPrefix}/reports`} element={<CostReports />} />,
			<Route key={`${urlPrefix}-cost-analysis`} path={`${urlPrefix}/cost-analysis`} element={<CostAnalysisReport />} />,
			<Route key={`${urlPrefix}-inventory`} path={`${urlPrefix}/inventory`} element={<InventoryData />} />,
			<Route key={`${urlPrefix}-logs`} path={`${urlPrefix}/logs`} element={<LogsTest />} />,
			<Route key={`${urlPrefix}-conversion-rates`} path={`${urlPrefix}/conversion-rates`} element={<FGConversionRates />} />,
			<Route key={`${urlPrefix}-material-conversion-rates`} path={`${urlPrefix}/material-conversion-rates`} element={<MaterialConversionRates />} />,
			<Route key={`${urlPrefix}-role-management`} path={`${urlPrefix}/role-management`} element={<RoleManagement />} />
		];
	};
	return (
		<HelmetProvider>
			<Router>
				<div className="min-h-screen bg-gray-50">
					<Navbar />
					<main className="w-full px-4 py-8">
						{isLoading ? (
							<div className="flex justify-center items-center h-64">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
							</div>
						) : (
							<Routes>
								{/* Default Routes */}
								<Route path="/" element={<Dashboard />} />
								<Route path="/batches" element={<BatchManagement />} />
								<Route path="/weighing" element={<MaterialWeighing />} />
								<Route path="/production" element={<ProductionResults />} />
								<Route path="/costs" element={<CostCalculation />} />
								<Route path="/reports" element={<CostReports />} />
								<Route path="/cost-analysis" element={<CostAnalysisReport />} />
								<Route path="/logs" element={<LogsTest />} />
								<Route path="/logs-test" element={<LogsTest />} />
								<Route path="/inventory" element={<InventoryData />} />
								<Route path="/conversion-rates" element={<FGConversionRates />} />
								<Route path="/material-conversion-rates" element={<MaterialConversionRates />} />
								
								{/* Superadmin Routes */}
								<Route path="/superadmin/role-management" element={<RoleManagement />} />
								
								{/* Dynamic Role Routes */}
								{roles.map(role => generateRoleRoutes(role)).flat()}
							</Routes>
						)}
					</main>
					<Toaster position="top-right" />
				</div>
			</Router>
		</HelmetProvider>
	);
}

export default App;
