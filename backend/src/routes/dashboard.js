const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const db = require('../db');

// All dashboard routes are protected
router.use(authMiddleware);

router.use(isAdmin);

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    // Total de metros cúbicos
    const totalCubicMetersRes = await db.query('SELECT SUM(cubic_meters) as total FROM scaffolds');
    const totalCubicMeters = parseFloat(totalCubicMetersRes.rows[0].total) || 0;

    // Proyectos activos
    const activeProjectsRes = await db.query("SELECT COUNT(*) as total FROM projects WHERE status = 'active'");
    const activeProjects = parseInt(activeProjectsRes.rows[0].total, 10);

    // Reportes en las últimas 24 horas
    const recentReportsCountRes = await db.query("SELECT COUNT(*) as total FROM scaffolds WHERE assembly_created_at >= NOW() - INTERVAL '24 hours'");
    const recentReportsCount = parseInt(recentReportsCountRes.rows[0].total, 10);

    // Últimos 5 reportes
    const recentReportsRes = await db.query(`
      SELECT 
        s.id, s.assembly_created_at as created_at, s.project_id,
        p.name as project_name,
        u.name as user_name
      FROM scaffolds s
      JOIN projects p ON s.project_id = p.id
      JOIN users u ON s.user_id = u.id
      ORDER BY s.assembly_created_at DESC
      LIMIT 5
    `);
    const recentReports = recentReportsRes.rows;

    res.json({
      activeProjects,
      totalCubicMeters,
      recentReportsCount,
      recentReports
    });

  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
