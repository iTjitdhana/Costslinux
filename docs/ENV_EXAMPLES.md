## Environment Variable Examples

### Backend (`config.env`)
```
PORT=3104

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=esp_tracker
DB_USER=your_user
DB_PASSWORD=your_password

DEFAULT_ITEM_DB_HOST=127.0.0.1
DEFAULT_ITEM_DB_PORT=3306
DEFAULT_ITEM_DB_NAME=default_itemvalue
DEFAULT_ITEM_DB_USER=your_user
DEFAULT_ITEM_DB_PASSWORD=your_password

ALLOWED_ORIGINS=http://localhost:3014
```

### Frontend (`frontend/.env`)
```
PORT=3014
REACT_APP_API_URL=http://localhost:3104
```


