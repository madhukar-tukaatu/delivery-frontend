import L from 'leaflet';

function createDivIcon(className, label) {
  return L.divIcon({
    className: '',
    html: `
      <div class="custom-pin ${className}">
        <span>${label}</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
}

export const merchantIcon = createDivIcon('pin-merchant', 'M');
export const branchIcon = createDivIcon('pin-branch', 'B');
export const subBranchIcon = createDivIcon('pin-subbranch', 'S');
export const hubIcon = createDivIcon('pin-hub', 'H');