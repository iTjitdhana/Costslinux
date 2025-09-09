import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { getPageTitle } from '../config/pageTitles';
import { 
  Package, 
  Scale, 
  Factory, 
  Calculator, 
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { batchAPI, costAPI, formatCurrency, formatNumber } from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBatches: 0,
    activeBatches: 0,
    completedBatches: 0,
    totalCost: 0,
    avgYield: 0,
    avgTime: 0
  });
  const [recentBatches, setRecentBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // ดึงข้อมูลล็อตล่าสุด
      const batchesResponse = await batchAPI.getAll();
      const batches = batchesResponse.data.data || [];
      
      // คำนวณสถิติ
      const totalBatches = batches.length;
      const activeBatches = batches.filter(b => b.status === 'producing').length;
      const completedBatches = batches.filter(b => b.status === 'completed').length;
      
      // ดึงข้อมูลต้นทุนล่าสุด
      const costResponse = await costAPI.getSummary();
      const costData = costResponse.data.data || [];
      const totalCost = costData.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);
      
      setStats({
        totalBatches,
        activeBatches,
        completedBatches,
        totalCost,
        avgYield: 85.5, // ค่าเฉลี่ย yield
        avgTime: 4.2 // ค่าเฉลี่ยเวลาการผลิต (ชั่วโมง)
      });
      
      setRecentBatches(batches.slice(0, 5));
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('ไม่สามารถโหลดข้อมูล Dashboard ได้');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      preparing: { color: 'badge-warning', text: 'เตรียมการ' },
      producing: { color: 'badge-info', text: 'กำลังผลิต' },
      completed: { color: 'badge-success', text: 'เสร็จสิ้น' },
      cancelled: { color: 'badge-danger', text: 'ยกเลิก' }
    };
    
    const config = statusConfig[status] || { color: 'badge-secondary', text: status };
    
    return (
      <span className={`badge ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{getPageTitle('Dashboard')}</title>
      </Helmet>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">ภาพรวมระบบคำนวณต้นทุนการผลิต</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="btn btn-primary"
        >
          รีเฟรช
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ล็อตทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBatches}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Factory className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">กำลังผลิต</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeBatches}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">เสร็จสิ้น</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedBatches}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-danger-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ต้นทุนรวม</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalCost)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">ประสิทธิภาพการผลิต</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-success-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Yield เฉลี่ย</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{formatNumber(stats.avgYield)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-warning-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">เวลาการผลิตเฉลี่ย</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{formatNumber(stats.avgTime)} ชม.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">การแจ้งเตือน</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {stats.activeBatches > 0 ? (
                <div className="flex items-center p-3 bg-warning-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-warning-600 mr-2" />
                  <span className="text-sm text-warning-800">
                    มีล็อตที่กำลังผลิตอยู่ {stats.activeBatches} ล็อต
                  </span>
                </div>
              ) : (
                <div className="flex items-center p-3 bg-success-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-success-600 mr-2" />
                  <span className="text-sm text-success-800">
                    ไม่มีล็อตที่กำลังผลิตอยู่
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Batches */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">ล็อตล่าสุด</h3>
        </div>
        <div className="card-body">
          {recentBatches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>รหัสล็อต</th>
                    <th>ผลิตภัณฑ์</th>
                    <th>สถานะ</th>
                    <th>วันที่สร้าง</th>
                    <th>จำนวนที่วางแผน</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBatches.map((batch) => (
                    <tr key={batch.id}>
                      <td className="font-medium">{batch.batch_code}</td>
                      <td>{batch.fg_name}</td>
                      <td>{getStatusBadge(batch.status)}</td>
                      <td>{new Date(batch.created_at).toLocaleDateString('th-TH')}</td>
                      <td>{formatNumber(batch.planned_qty)} {batch.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">ยังไม่มีข้อมูลล็อตการผลิต</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
