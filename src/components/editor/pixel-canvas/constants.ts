import { SELECTION_CONFIG } from '@/lib/constants';

export const COLOR_NEIGHBOR_OFFSETS =
  // Shared by bucket fill and wand selection; switch between 4-way and 8-way connectivity.
  SELECTION_CONFIG.COLOR_CONNECTIVITY === 8
    ? [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]
    : [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];

export const RESIZE_HANDLE_THICKNESS = 12;
export const RESIZE_HANDLE_GAP = 4;
