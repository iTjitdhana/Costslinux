import React from 'react';
import { ConfigProvider } from 'antd';
import thTH from 'antd/locale/th_TH';

const AntdConfigProvider = ({ children, theme = {} }) => {
  // ตรวจสอบว่า React และ useContext พร้อมใช้งาน
  if (!React || typeof React.useContext !== 'function') {
    console.error('React.useContext is not available');
    return <div>{children}</div>;
  }

  // ตรวจสอบว่า ConfigProvider พร้อมใช้งาน
  if (!ConfigProvider) {
    console.error('Antd ConfigProvider is not available');
    return <div>{children}</div>;
  }

  try {
    return (
      <ConfigProvider
        locale={thTH}
        theme={{
          token: {
            colorPrimary: '#10b981',
            borderRadius: 6,
            colorError: '#ef4444',
            ...theme.token
          },
          ...theme
        }}
      >
        {children}
      </ConfigProvider>
    );
  } catch (error) {
    console.error('ConfigProvider error:', error);
    return <div>{children}</div>;
  }
};

export default AntdConfigProvider;
