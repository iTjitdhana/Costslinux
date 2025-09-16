import React from 'react';
import { ConfigProvider } from 'antd';
import thTH from 'antd/locale/th_TH';

const AntdConfigProvider = ({ children, theme = {} }) => {
  // ตรวจสอบว่า React context ทำงานได้หรือไม่
  if (typeof React.useContext === 'undefined') {
    console.error('React.useContext is not available');
    return <>{children}</>;
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
    return <>{children}</>;
  }
};

export default AntdConfigProvider;
