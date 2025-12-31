const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const db = require('../db');

// Proteger todas las rutas
router.use(authMiddleware);

// GET /api/supervisor-dashboard/summary - Resumen para supervisores
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Total de reportes del supervisor
    const totalReportsRes = await db.query(
      'SELECT COUNT(*) as total FROM scaffolds WHERE user_id = $1',
      [userId]
    );
    const totalReports = parseInt(totalReportsRes.rows[0].total, 10);
    
    // Reportes este mes
    const monthReportsRes = await db.query(
      `SELECT COUNT(*) as total FROM scaffolds 
       WHERE user_id = $1 AND assembly_created_at >= date_trunc('month', NOW())`,
      [userId]
    );
    const monthReports = parseInt(monthReportsRes.rows[0].total, 10);
    
    // Total metros cúbicos
    const totalCubicMetersRes = await db.query(
      'SELECT SUM(cubic_meters) as total FROM scaffolds WHERE user_id = $1',
      [userId]
    );
    const totalCubicMeters = parseFloat(totalCubicMetersRes.rows[0].total) || 0;
    
    // Proyectos activos asignados
    const activeProjectsRes = await db.query(
      `SELECT COUNT(DISTINCT p.id) as total 
       FROM projects p 
       JOIN project_users pu ON p.id = pu.project_id 
       WHERE pu.user_id = $1 AND p.status = 'active'`,
      [userId]
    );
    const activeProjects = parseInt(activeProjectsRes.rows[0].total, 10);
    
    res.json({
      totalReports,
      monthReports,
      totalCubicMeters,
      activeProjects
    });
  } catch (error) {
    console.error('Error fetching supervisor dashboard summary:', error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

module.exports = router;
