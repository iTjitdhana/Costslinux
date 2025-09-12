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
import DateRangePickerTest from './pages/DateRangePickerTest';
import NativeDateRangePickerTest from './pages/NativeDateRangePickerTest';
import AntDateRangePickerTest from './pages/AntDateRangePickerTest';
import DateRangePickerDebugTest from './pages/DateRangePickerDebugTest';
import DateRangePickerFixedTest from './pages/DateRangePickerFixedTest';
import DateRangeValidationTest from './pages/DateRangeValidationTest';
import DateRangeValidationFixTest from './pages/DateRangeValidationFixTest';
import DateRangeSelectionTest from './pages/DateRangeSelectionTest';
import DateRangeQuickTest from './pages/DateRangeQuickTest';
import SimpleDateTest from './pages/SimpleDateTest';
import AdminTest from './pages/AdminTest';
import LogsDateTest from './pages/LogsDateTest';
import CustomDateTest from './pages/CustomDateTest';
import AntDesignLogicTest from './pages/AntDesignLogicTest';
import UserErrorPreventionTest from './pages/UserErrorPreventionTest';
import ThaiLocaleTest from './pages/ThaiLocaleTest';
import SearchDebugTest from './pages/SearchDebugTest';
import SimpleSearchTest from './pages/SimpleSearchTest';
import DateFilterTest from './pages/DateFilterTest';
import TimezoneTest from './pages/TimezoneTest';
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
			<Route key={`${urlPrefix}-role-management`} path={`${urlPrefix}/role-management`} element={<RoleManagement />} />,
			<Route key={`${urlPrefix}-date-range-test`} path={`${urlPrefix}/date-range-test`} element={<DateRangePickerTest />} />,
			<Route key={`${urlPrefix}-native-date-range-test`} path={`${urlPrefix}/native-date-range-test`} element={<NativeDateRangePickerTest />} />,
			<Route key={`${urlPrefix}-ant-date-range-test`} path={`${urlPrefix}/ant-date-range-test`} element={<AntDateRangePickerTest />} />,
			<Route key={`${urlPrefix}-date-range-debug-test`} path={`${urlPrefix}/date-range-debug-test`} element={<DateRangePickerDebugTest />} />,
			<Route key={`${urlPrefix}-date-range-fixed-test`} path={`${urlPrefix}/date-range-fixed-test`} element={<DateRangePickerFixedTest />} />,
			<Route key={`${urlPrefix}-date-range-validation-test`} path={`${urlPrefix}/date-range-validation-test`} element={<DateRangeValidationTest />} />,
			<Route key={`${urlPrefix}-date-range-validation-fix-test`} path={`${urlPrefix}/date-range-validation-fix-test`} element={<DateRangeValidationFixTest />} />,
			<Route key={`${urlPrefix}-date-range-selection-test`} path={`${urlPrefix}/date-range-selection-test`} element={<DateRangeSelectionTest />} />,
			<Route key={`${urlPrefix}-date-range-quick-test`} path={`${urlPrefix}/date-range-quick-test`} element={<DateRangeQuickTest />} />,
			<Route key={`${urlPrefix}-simple-date-test`} path={`${urlPrefix}/simple-date-test`} element={<SimpleDateTest />} />
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
								
								{/* Admin Test Routes */}
								<Route path="/admin-test" element={<AdminTest />} />
								<Route path="/logs-date-test" element={<LogsDateTest />} />
								<Route path="/custom-date-test" element={<CustomDateTest />} />
								<Route path="/ant-design-logic-test" element={<AntDesignLogicTest />} />
								<Route path="/user-error-prevention-test" element={<UserErrorPreventionTest />} />
								<Route path="/thai-locale-test" element={<ThaiLocaleTest />} />
								<Route path="/search-debug-test" element={<SearchDebugTest />} />
								<Route path="/simple-search-test" element={<SimpleSearchTest />} />
								<Route path="/date-filter-test" element={<DateFilterTest />} />
								<Route path="/timezone-test" element={<TimezoneTest />} />
								
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
