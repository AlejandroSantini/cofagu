import { type ComboStage, type Load } from '../types';

/**
 * Etapa efectiva del combo. Cargas viejas o iniciadas por "Iniciar Viaje"
 * del transportista (POST /loads/applications/:id/start, que no toca
 * `comboStage`) pueden quedar en LEG1_ASSIGNED con la carga ya IN_PROGRESS:
 * el backend igual acepta registrar la descarga del tramo 1 en ese caso
 * (solo pide status IN_PROGRESS + currentLeg 1), así que se trata como ida
 * en curso.
 */
export function getComboStage(subload: Pick<Load, 'status' | 'comboStage' | 'currentLeg'>): ComboStage {
  if (subload.status === 'COMPLETED' || subload.comboStage === 'COMPLETED') return 'COMPLETED';
  const stage = subload.comboStage;
  if (stage === 'LEG1_COMPLETED' || stage === 'LEG2_IN_PROGRESS') return stage;
  if (subload.currentLeg === 2) return 'LEG2_IN_PROGRESS';
  if (stage === 'LEG1_IN_PROGRESS' || subload.status === 'IN_PROGRESS' || (subload.status as string) === 'DELAYED') {
    return 'LEG1_IN_PROGRESS';
  }
  return 'LEG1_ASSIGNED';
}
