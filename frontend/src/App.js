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
import LogsTest from './pages/LogsTest';

function App() {
	return (
		<Router>
			<div className="min-h-screen bg-gray-50">
				<Navbar />
				<main className="container mx-auto px-4 py-8">
					<Routes>
						<Route path="/" element={<Dashboard />} />
						<Route path="/batches" element={<BatchManagement />} />
						<Route path="/weighing" element={<MaterialWeighing />} />
						<Route path="/production" element={<ProductionResults />} />
						<Route path="/costs" element={<CostCalculation />} />
						<Route path="/reports" element={<CostReports />} />
						<Route path="/logs-test" element={<LogsTest />} />
					</Routes>
				</main>
				<Toaster position="top-right" />
			</div>
		</Router>
	);
}

export default App;
