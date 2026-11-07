import React from 'react';

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const ClassroomIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="12" rx="1.2" />
    <path d="M7 20h10M9 16l-1 4M15 16l1 4M7 8h6M7 11h4" />
  </svg>
);

export const LabIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M9 3h6M10 3v6.2L5.3 18a2 2 0 0 0 1.8 3h9.8a2 2 0 0 0 1.8-3L14 9.2V3" />
    <path d="M8 15h8" />
  </svg>
);

export const StudySpaceIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 6.5C10.5 5.3 7.9 4.6 5 4.5v13.2c2.9.1 5.5.8 7 2 1.5-1.2 4.1-1.9 7-2V4.5c-2.9.1-5.5.8-7 2Z" />
    <path d="M12 6.5v13.2" />
  </svg>
);

export const FacilityIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 10l8-5.5L20 10M5 10v9h14v-9M9 19v-5h6v5" />
  </svg>
);

const TYPE_ICONS = {
  CLASSROOM: ClassroomIcon,
  LAB: LabIcon,
  STUDY_SPACE: StudySpaceIcon,
  FACILITY: FacilityIcon,
};

export function TypeIcon({ type, ...rest }) {
  const Cmp = TYPE_ICONS[type] || FacilityIcon;
  return <Cmp {...rest} />;
}

export const UsersIcon = (p) => (
  <svg {...base} width={14} height={14} {...p}>
    <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5" />
    <path d="M15.5 6.2A3 3 0 0 1 17 12M16 14c2.1.3 3.7 2 4.2 5" />
  </svg>
);

export const ThermoIcon = (p) => (
  <svg {...base} width={14} height={14} {...p}>
    <path d="M12 14.5V5a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0Z" />
  </svg>
);

export const DropletIcon = (p) => (
  <svg {...base} width={14} height={14} {...p}>
    <path d="M12 3s6 7 6 11.5a6 6 0 1 1-12 0C6 10 12 3 12 3Z" />
  </svg>
);

export const BoltIcon = (p) => (
  <svg {...base} width={14} height={14} {...p}>
    <path d="M12 3 4 14h6l-1 7 9-12h-6l1-6Z" />
  </svg>
);

export const PinIcon = (p) => (
  <svg {...base} width={13} height={13} {...p}>
    <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
    <circle cx="12" cy="9.3" r="2.2" />
  </svg>
);

export const BuildingIcon = (p) => (
  <svg {...base} width={20} height={20} {...p}>
    <path d="M5 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16M5 21h14M13 21v-5h5a1 1 0 0 1 1 1v4" />
    <path d="M8 7.5h1M8 11h1M8 14.5h1M12 7.5h1M12 11h1M12 14.5h1" />
  </svg>
);

export const CheckIcon = (p) => (
  <svg {...base} width={20} height={20} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.3 12.3 2.6 2.6 5-5.2" />
  </svg>
);

export const CrestIcon = (p) => (
  <svg viewBox="0 0 48 48" width={30} height={30} fill="none" {...p}>
    <path
      d="M24 4 44 13v10c0 12.2-8.3 19.8-20 21-11.7-1.2-20-8.8-20-21V13L24 4Z"
      fill="currentColor"
      opacity="0.14"
    />
    <path
      d="M24 4 44 13v10c0 12.2-8.3 19.8-20 21-11.7-1.2-20-8.8-20-21V13L24 4Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M14 22.5 24 27l10-4.5M24 27v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path
      d="M24 14 12 19.5 24 25l12-5.5L24 14Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

export const AlertIcon = (p) => (
  <svg {...base} width={20} height={20} {...p}>
    <path d="M10.3 3.9 2.6 17.5A1.5 1.5 0 0 0 4 19.8h16a1.5 1.5 0 0 0 1.4-2.3L13.7 3.9a1.5 1.5 0 0 0-2.6 0Z" />
    <path d="M12 9.5v4M12 16.3h.01" />
  </svg>
);

export const CalendarIcon = (p) => (
  <svg {...base} width={15} height={15} {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

export const ClockIcon = (p) => (
  <svg {...base} width={14} height={14} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const BellIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5l1.5-2Z" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </svg>
);

export const WrenchIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M14.7 6.3a4 4 0 0 0-5.1 5.1L4 17v3h3l5.6-5.6a4 4 0 0 0 5.1-5.1l-2.5 2.5-2.4-.5-.5-2.4 2.4-2.6Z" />
  </svg>
);
