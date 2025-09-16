import React from 'react';
import { ConfigProvider } from 'antd';
import thTH from 'antd/locale/th_TH';

const AntdConfigProvider = ({ children, theme = {} }) => {
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
};

export default AntdConfigProvider;
