const express = require('express');
const router = express.Router();
const { logsQuery } = require('../../database/logsConnection');

// Helper function to parse menu_items (handle both JSON and comma-separated strings)
function parseMenuItems(menuItems) {
    if (!menuItems) return [];
    
    // If it's already an array, return it as is
    if (Array.isArray(menuItems)) {
        return menuItems;
    }
    
    // If it's a string, try to parse as JSON first
    if (typeof menuItems === 'string') {
        try {
            return JSON.parse(menuItems);
        } catch (error) {
            // If JSON parsing fails, treat as comma-separated string
            return menuItems.split(',').map(item => item.trim()).filter(item => item.length > 0);
        }
    }
    
    return [];
}

// GET /api/roles - Get all roles
router.get('/', async (req, res) => {
    try {
        const [roles] = await logsQuery('SELECT * FROM role_configurations ORDER BY created_at DESC');
        
        // Parse menu_items for each role (handle both JSON and comma-separated strings)
        const parsedRoles = roles.map(role => ({
            ...role,
            menu_items: parseMenuItems(role.menu_items)
        }));
        
        res.json(parsedRoles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/roles/:id - Get specific role
router.get('/:id', async (req, res) => {
    try {
        const [roles] = await logsQuery('SELECT * FROM role_configurations WHERE id = ?', [req.params.id]);
        
        if (roles.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }
        
        const role = roles[0];
        role.menu_items = parseMenuItems(role.menu_items);
        
        res.json(role);
    } catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/roles - Create new role
router.post('/', async (req, res) => {
    try {
        const { role_name, display_name, color, url_prefix, menu_items } = req.body;
        
        // Validate required fields
        if (!role_name || !display_name || !url_prefix) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Check if role_name already exists
        const [existingRoles] = await logsQuery('SELECT id FROM role_configurations WHERE role_name = ?', [role_name]);
        if (existingRoles.length > 0) {
            return res.status(400).json({ error: 'Role name already exists' });
        }
        
        // Insert new role
        const [result] = await logsQuery(
            'INSERT INTO role_configurations (role_name, display_name, color, url_prefix, menu_items) VALUES (?, ?, ?, ?, ?)',
            [role_name, display_name, color, url_prefix, JSON.stringify(menu_items || [])]
        );
        
        // Get the created role
        const [newRole] = await logsQuery('SELECT * FROM role_configurations WHERE id = ?', [result.insertId]);
        
        const role = newRole[0];
        role.menu_items = parseMenuItems(role.menu_items);
        
        res.status(201).json(role);
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/roles/:id - Update role
router.put('/:id', async (req, res) => {
    try {
        const { role_name, display_name, color, url_prefix, menu_items } = req.body;
        
        // Validate required fields
        if (!role_name || !display_name || !url_prefix) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Check if role_name already exists (excluding current role)
        const [existingRoles] = await logsQuery(
            'SELECT id FROM role_configurations WHERE role_name = ? AND id != ?', 
            [role_name, req.params.id]
        );
        if (existingRoles.length > 0) {
            return res.status(400).json({ error: 'Role name already exists' });
        }
        
        // Update role
        await logsQuery(
            'UPDATE role_configurations SET role_name = ?, display_name = ?, color = ?, url_prefix = ?, menu_items = ? WHERE id = ?',
            [role_name, display_name, color, url_prefix, JSON.stringify(menu_items || []), req.params.id]
        );
        
        // Get the updated role
        const [updatedRoles] = await logsQuery('SELECT * FROM role_configurations WHERE id = ?', [req.params.id]);
        
        if (updatedRoles.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }
        
        const role = updatedRoles[0];
        role.menu_items = parseMenuItems(role.menu_items);
        
        res.json(role);
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/roles/:id - Delete role
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await logsQuery('DELETE FROM role_configurations WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }
        
        res.json({ message: 'Role deleted successfully' });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/roles/by-url/:urlPrefix - Get role by URL prefix
router.get('/by-url/:urlPrefix', async (req, res) => {
    try {
        const [roles] = await logsQuery(
            'SELECT * FROM role_configurations WHERE url_prefix = ?', 
            [req.params.urlPrefix]
        );
        
        if (roles.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }
        
        const role = roles[0];
        role.menu_items = parseMenuItems(role.menu_items);
        
        res.json(role);
    } catch (error) {
        console.error('Error fetching role by URL:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
