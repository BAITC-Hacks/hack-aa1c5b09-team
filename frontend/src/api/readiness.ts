import type { NeedCard, ReadinessCriterion, ReadinessLevel, ReadinessRating } from './types';

// Calculation is for the local demo only. Live clients display the server's readiness response.
export const readinessDefinitions: { criterion: ReadinessCriterion; label: string; description: string; weight: number; fields: (keyof NeedCard)[] }[] = [
  { criterion: 'CONTEXT', label: 'Контекст и потребность', description: 'Понятно, что происходит сейчас и что необходимо изменить.', weight: 20, fields: ['description'] },
  { criterion: 'MATERIALS', label: 'Данные и материалы', description: 'Указаны доступные данные, примеры или источники.', weight: 20, fields: ['materials'] },
  { criterion: 'RESULT', label: 'Ожидаемый результат', description: 'Описан конкретный результат работы команды.', weight: 15, fields: ['outcome'] },
  { criterion: 'SUCCESS', label: 'Критерии успеха', description: 'Есть измеримые признаки принятия решения.', weight: 15, fields: ['successCriteria'] },
  { criterion: 'CONSTRAINTS', label: 'Ограничения', description: 'Указаны сроки, технологии, доступы или иные границы.', weight: 10, fields: ['requirements', 'deadline'] },
  { criterion: 'USERS', label: 'Пользователи', description: 'Понятно, для кого создаётся решение.', weight: 10, fields: ['targetUsers'] },
  { criterion: 'BUSINESS', label: 'Связь с бизнесом', description: 'Есть контакт, формат консультаций и порядок обратной связи.', weight: 10, fields: ['businessContact', 'consultationFormat', 'feedbackProcedure'] },
];

export const readinessLabels: Record<ReadinessLevel, string> = {
  NEEDS_CLARIFICATION: 'Требует уточнения', WORKABLE: 'Рабочая', READY: 'Готовая', PRIORITY: 'Приоритетная',
};

export function calculateDemoReadiness(card: NeedCard, confirmations: ReadinessCriterion[] = []): ReadinessRating {
  const criteria = readinessDefinitions.map(item => {
    const present = item.fields.map(field => Boolean(card[field]?.trim()));
    const filled = item.criterion === 'CONSTRAINTS' ? present.some(Boolean) : present.every(Boolean);
    const confirmed = filled && confirmations.includes(item.criterion);
    return { criterion: item.criterion, label: item.label, description: item.description, weight: item.weight, filled, confirmed, points: confirmed ? item.weight : 0 };
  });
  const score = criteria.reduce((sum, item) => sum + item.points, 0);
  return { score, maxScore: 100, level: score >= 90 ? 'PRIORITY' : score >= 70 ? 'READY' : score >= 40 ? 'WORKABLE' : 'NEEDS_CLARIFICATION', catalogPriority: score >= 90 ? 2 : score >= 70 ? 1 : 0, criteria };
}

export function retainedConfirmations(before: NeedCard, after: NeedCard, readiness?: ReadinessRating): ReadinessCriterion[] {
  return readinessDefinitions.filter(item => readiness?.criteria.some(c => c.criterion === item.criterion && c.confirmed)
    && item.fields.every(field => (before[field] || '').trim() === (after[field] || '').trim())).map(item => item.criterion);
}
