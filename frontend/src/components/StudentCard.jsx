import React from 'react';
import { TypeIcon, PinIcon, CalendarIcon } from '../icons';

const typeLabels = {
  CLASSROOM: 'Classroom',
  LAB: 'Laboratory',
  STUDY_SPACE: 'Study space',
  FACILITY: 'Facility',
};

export default function StudentCard({ resource, onBook }) {
  const isAvailable = resource.status === 'AVAILABLE';

  return (
    <div className={`student-card ${isAvailable ? 'student-card--available' : 'student-card--taken'}`}>
      <div className="student-card__top">
        <span className={`card-icon card-icon--${resource.type}`}>
          <TypeIcon type={resource.type} />
        </span>
        <div className="student-card__heading">
          <h3 className="student-card__name">{resource.name}</h3>
          <p className="student-card__meta">
            {typeLabels[resource.type] || resource.type} · Floor {resource.floor}
          </p>
        </div>
        <span className={`status-pill status-pill--${isAvailable ? 'good' : 'neutral'}`}>
          {isAvailable ? 'Available' : resource.status.replace('_', ' ').toLowerCase()}
        </span>
      </div>
      <div className="student-card__footer">
        <span className="student-card__location">
          <PinIcon /> {resource.building?.name}
        </span>
        {resource.capacity && <span className="student-card__capacity">Seats up to {resource.capacity}</span>}
      </div>
      {onBook && resource.status !== 'MAINTENANCE' && (
        <button className="book-button" onClick={() => onBook(resource)}>
          <CalendarIcon /> Book this space
        </button>
      )}
    </div>
  );
}
