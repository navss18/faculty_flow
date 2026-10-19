import type { Task, Profile, Subject, SyllabusTopic } from '../types/database';

export interface FacultyWorkloadStats {
  facultyId: string;
  facultyName: string;
  department: string;
  designation: string;
  totalActiveHours: number;
  completedHours: number;
  teachingHours: number;
  researchHours: number;
  gradingHours: number;
  meetingHours: number;
  adminHours: number;
  pendingTaskCount: number;
  overdueTaskCount: number;
  completedTaskCount: number;
  capacityUtilization: number; // Percentage of 40h standard week
  loadStatus: 'Underloaded' | 'Optimal' | 'Heavy' | 'Overloaded';
  recommendations: string[];
}

export interface DepartmentFairnessReport {
  department: string;
  facultyCount: number;
  totalDepartmentHours: number;
  averageHoursPerFaculty: number;
  maxHoursFaculty: string;
  minHoursFaculty: string;
  fairnessScore: number; // 0 to 100%
  fairnessRating: 'Well Balanced' | 'Moderate Imbalance' | 'Severe Imbalance';
  recommendation: string;
}

/**
 * Deterministically computes individual faculty workload statistics and actionable recommendations.
 */
export function calculateFacultyWorkload(
  faculty: Profile,
  tasks: Task[]
): FacultyWorkloadStats {
  const facultyTasks = tasks.filter(
    (t) => t.created_by === faculty.id || t.assigned_faculty?.some((f) => f.id === faculty.id)
  );

  let teachingHours = 0;
  let researchHours = 0;
  let gradingHours = 0;
  let meetingHours = 0;
  let adminHours = 0;
  let completedHours = 0;
  let pendingTaskCount = 0;
  let overdueTaskCount = 0;
  let completedTaskCount = 0;

  const today = new Date().toISOString().split('T')[0];

  for (const t of facultyTasks) {
    const hours = Number(t.estimated_hours) || 2;
    if (t.status === 'Completed') {
      completedHours += hours;
      completedTaskCount++;
    } else {
      // In Progress or Pending
      pendingTaskCount++;
      if (t.due_date && t.due_date < today) {
        overdueTaskCount++;
      }

      switch (t.category) {
        case 'Teaching':
          teachingHours += hours;
          break;
        case 'Research':
          researchHours += hours;
          break;
        case 'Grading':
          gradingHours += hours;
          break;
        case 'Meetings':
          meetingHours += hours;
          break;
        case 'Administrative':
          adminHours += hours;
          break;
      }
    }
  }

  const totalActiveHours = teachingHours + researchHours + gradingHours + meetingHours + adminHours;
  const standardWeekHours = 40;
  const capacityUtilization = Math.round((totalActiveHours / standardWeekHours) * 100);

  let loadStatus: FacultyWorkloadStats['loadStatus'] = 'Optimal';
  if (totalActiveHours > 45) {
    loadStatus = 'Overloaded';
  } else if (totalActiveHours > 35) {
    loadStatus = 'Heavy';
  } else if (totalActiveHours < 20) {
    loadStatus = 'Underloaded';
  }

  // Deterministic rule-based recommendations
  const recommendations: string[] = [];

  if (overdueTaskCount > 0) {
    recommendations.push(
      `⚠️ Prioritize ${overdueTaskCount} overdue task${overdueTaskCount > 1 ? 's' : ''} immediately before scheduling new academic duties.`
    );
  }

  if (teachingHours > 18) {
    recommendations.push(
      `High teaching allocation (${teachingHours}h). Recommend requesting lab assistant support or initiating a lecture handover.`
    );
  }

  if (gradingHours > 10) {
    recommendations.push(
      `Grading load is concentrated (${gradingHours}h). Block quiet evaluation hours or request peer moderation.`
    );
  }

  if (researchHours === 0 && pendingTaskCount > 0) {
    recommendations.push(
      `Zero research hours logged this cycle. Reserve at least 6-8 weekly hours for publications or grant deliverables.`
    );
  }

  if (loadStatus === 'Underloaded') {
    recommendations.push(
      `Available capacity identified (${totalActiveHours}h active / 40h benchmark). Suitable candidate for upcoming elective or committee leadership.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      `Balanced workload across duties. On track with semester performance milestones.`
    );
  }

  return {
    facultyId: faculty.id,
    facultyName: faculty.full_name,
    department: faculty.department || 'General Engineering',
    designation: faculty.designation || 'Faculty Member',
    totalActiveHours,
    completedHours,
    teachingHours,
    researchHours,
    gradingHours,
    meetingHours,
    adminHours,
    pendingTaskCount,
    overdueTaskCount,
    completedTaskCount,
    capacityUtilization,
    loadStatus,
    recommendations
  };
}

/**
 * Calculates Department-wide Workload Fairness Index (Gini-derived coefficient).
 * Enables HODs to detect unfair faculty exploitation or under-utilization without paid tools.
 */
export function calculateDepartmentFairness(
  facultyList: Profile[],
  tasks: Task[],
  department: string = 'Computer Science & Engineering'
): DepartmentFairnessReport {
  const deptFaculty = facultyList.filter(
    (f) => !f.department || f.department.toLowerCase() === department.toLowerCase()
  );

  if (deptFaculty.length === 0) {
    return {
      department,
      facultyCount: 0,
      totalDepartmentHours: 0,
      averageHoursPerFaculty: 0,
      maxHoursFaculty: 'N/A',
      minHoursFaculty: 'N/A',
      fairnessScore: 100,
      fairnessRating: 'Well Balanced',
      recommendation: 'No faculty profiles currently assigned to this department.'
    };
  }

  const workloads = deptFaculty.map((f) => calculateFacultyWorkload(f, tasks));
  const hoursList = workloads.map((w) => w.totalActiveHours);
  const totalHours = hoursList.reduce((acc, h) => acc + h, 0);
  const avgHours = totalHours / deptFaculty.length;

  const sortedWorkloads = [...workloads].sort((a, b) => b.totalActiveHours - a.totalActiveHours);
  const maxFaculty = `${sortedWorkloads[0].facultyName} (${sortedWorkloads[0].totalActiveHours}h)`;
  const minFaculty = `${sortedWorkloads[sortedWorkloads.length - 1].facultyName} (${
    sortedWorkloads[sortedWorkloads.length - 1].totalActiveHours
  }h)`;

  // Variance & Standard Deviation
  const variance =
    hoursList.reduce((acc, h) => acc + Math.pow(h - avgHours, 2), 0) / deptFaculty.length;
  const stdDev = Math.sqrt(variance);

  // Normalized Fairness Score: 100 - (Coefficient of Variation * 50)
  const cv = avgHours > 0 ? stdDev / avgHours : 0;
  const fairnessScore = Math.max(0, Math.min(100, Math.round(100 - cv * 60)));

  let fairnessRating: DepartmentFairnessReport['fairnessRating'] = 'Well Balanced';
  let recommendation = 'Departmental load is harmoniously distributed across teaching staff.';

  if (fairnessScore < 60) {
    fairnessRating = 'Severe Imbalance';
    recommendation = `Significant skew detected. ${sortedWorkloads[0].facultyName} is handling disproportionate hours while others have bandwidth. Reallocate via task handover.`;
  } else if (fairnessScore < 80) {
    fairnessRating = 'Moderate Imbalance';
    recommendation = `Slight variance in load distribution. Consider balancing upcoming midterm grading or committee duties.`;
  }

  return {
    department,
    facultyCount: deptFaculty.length,
    totalDepartmentHours: totalHours,
    averageHoursPerFaculty: Math.round(avgHours * 10) / 10,
    maxHoursFaculty: maxFaculty,
    minHoursFaculty: minFaculty,
    fairnessScore,
    fairnessRating,
    recommendation
  };
}

/**
 * Calculates Syllabus Progress for a subject and its modules.
 */
export function calculateSyllabusMetrics(
  subject: Subject,
  topics: SyllabusTopic[]
) {
  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.status === 'Completed').length;
  const inProgressTopics = topics.filter((t) => t.status === 'In Progress').length;
  const pendingTopics = topics.filter((t) => t.status === 'Pending').length;

  const plannedHoursTotal = topics.reduce((sum, t) => sum + (Number(t.planned_hours) || 0), 0);
  const completedHours = topics
    .filter((t) => t.status === 'Completed')
    .reduce((sum, t) => sum + (Number(t.planned_hours) || 0), 0);

  const completionPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const hoursPercentage =
    plannedHoursTotal > 0 ? Math.round((completedHours / plannedHoursTotal) * 100) : 0;

  const today = new Date().toISOString().split('T')[0];
  const overdueTopics = topics.filter(
    (t) => t.status !== 'Completed' && t.target_date && t.target_date < today
  );

  return {
    totalTopics,
    completedTopics,
    inProgressTopics,
    pendingTopics,
    plannedHoursTotal,
    completedHours,
    completionPercentage,
    hoursPercentage,
    overdueTopicsCount: overdueTopics.length,
    overdueTopics
  };
}
