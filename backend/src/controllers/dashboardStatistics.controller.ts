import type { Request, Response, NextFunction } from "express";
import DashboardStatisticsService from "../services/dashboardStatistics.service.js";

const parseDateQuery = (value: unknown, endOfDay = false) => {
  if (typeof value !== "string") return undefined;

  const date = new Date(
    endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`,
  );
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const getRangeQuery = (req: Request) => ({
  from: parseDateQuery(req.query.from || req.query.dateFrom),
  to: parseDateQuery(req.query.to || req.query.dateTo, true),
});

export const getDashboardStatisticsOverviewHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await DashboardStatisticsService.getOverview(
      getRangeQuery(req),
    );

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getDashboardAppointmentStatisticsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await DashboardStatisticsService.getAppointments(
      getRangeQuery(req),
    );

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getDashboardRevenueStatisticsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await DashboardStatisticsService.getRevenue(
      getRangeQuery(req),
    );

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getDashboardDoctorStatisticsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await DashboardStatisticsService.getDoctors(
      getRangeQuery(req),
    );

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getDashboardDepartmentStatisticsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await DashboardStatisticsService.getDepartments(
      getRangeQuery(req),
    );

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
