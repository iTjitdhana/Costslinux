import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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

function App() {
	return (
		<Router>
			<div className="min-h-screen bg-gray-50">
				<Navbar />
				<main className="w-full px-4 py-8">
					<Routes>
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
					</Routes>
				</main>
				<Toaster position="top-right" />
			</div>
		</Router>
	);
}

export default App;
