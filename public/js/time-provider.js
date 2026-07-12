(function() {
    let simulatedDate = null;

    // Try to load from session storage
    try {
        const stored = sessionStorage.getItem('simulatedTime');
        if (stored) {
            simulatedDate = new Date(stored);
        }
    } catch(e) {}

    window.TimeProvider = {
        now: function() {
            if (simulatedDate) {
                return new Date(simulatedDate.getTime());
            }
            return new Date();
        },
        setSimulatedDate: function(date) {
            if (!(date instanceof Date) || isNaN(date.getTime())) {
                throw new Error("Invalid date");
            }
            simulatedDate = new Date(date.getTime());
            try {
                sessionStorage.setItem('simulatedTime', simulatedDate.toISOString());
            } catch(e) {}
            
            // Dispatch event
            const event = new CustomEvent('timeSimulationChanged', { detail: { date: simulatedDate } });
            window.dispatchEvent(event);
        },
        clearSimulation: function() {
            simulatedDate = null;
            try {
                sessionStorage.removeItem('simulatedTime');
            } catch(e) {}
            
            const event = new CustomEvent('timeSimulationChanged', { detail: { date: null } });
            window.dispatchEvent(event);
        },
        isSimulating: function() {
            return simulatedDate !== null;
        },
        getSimulatedDate: function() {
            return simulatedDate ? new Date(simulatedDate.getTime()) : null;
        }
    };
})();
