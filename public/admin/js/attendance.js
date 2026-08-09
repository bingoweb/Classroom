(function () {
    let allStudentsForAttendance = [];
    let currentAttendanceDate = '';

    function setTodayDate() {
        const today = Utils.getIstanbulDateKey();
        document.getElementById('attendanceDate').value = today;
        loadAttendanceForDate();
    }

    async function loadAttendanceForDate() {
        const dateInput = document.getElementById('attendanceDate');
        const date = dateInput.value;

        if (!date) {
            Utils.showError('Lütfen bir tarih seçin.');
            return;
        }

        currentAttendanceDate = date;

        try {
            const studentsRes = await fetch(`${CONFIG.API_URL}/students`);
            const students = await studentsRes.json();
            allStudentsForAttendance = students;

            const attendanceRes = await fetch(`${CONFIG.API_URL}/attendance/${date}`);
            const attendance = await attendanceRes.json();

            const attendanceMap = {};
            attendance.forEach(a => {
                attendanceMap[a.student_id] = a.status;
            });

            renderAttendanceList(students, attendanceMap);
            updateAttendanceSummary(students, attendanceMap);
        } catch (e) {
            if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error loading attendance', e); }
            Utils.showError('Yoklama yüklenirken hata oluştu.');
        }
    }

    function renderAttendanceList(students, attendanceMap) {
        const list = document.getElementById('attendanceList');
        list.innerHTML = students.map(s => {
            const avatarPath = Utils.getAvatarPath(s);
            let displayPath = avatarPath;
            if (Utils.normalizePath) {
                displayPath = Utils.normalizePath(avatarPath, false);
            }
            if (!displayPath.startsWith('http') && !displayPath.startsWith('../') && !displayPath.startsWith('data:')) {
                displayPath = displayPath.startsWith('/') ? '..' + displayPath : '../' + displayPath;
            }
            const currentStatus = attendanceMap[s.id] || 'present';
            return `
        <div class="student-item admin-attendance-student">
            <img src="${displayPath}" class="student-thumb admin-attendance-avatar" data-default-avatar="../assets/default_boy.png">
            <span class="admin-attendance-name">${Utils.escapeHtml(s.name)} (${s.gender === 'M' ? 'Erkek' : 'Kız'})</span>
            <label class="admin-attendance-choice">
                <input type="radio" name="attendance_${s.id}" value="present" ${currentStatus === 'present' ? 'checked' : ''} data-student-id="${s.id}">
                <span>Var</span>
            </label>
            <label class="admin-attendance-choice">
                <input type="radio" name="attendance_${s.id}" value="absent" ${currentStatus === 'absent' ? 'checked' : ''} data-student-id="${s.id}">
                <span>Yok</span>
            </label>
        </div>
    `;
        }).join('');
    }

    function updateAttendanceSummary(students, attendanceMap) {
        const total = students.length;
        let present = 0;
        let absent = 0;

        students.forEach(s => {
            const status = attendanceMap[s.id] || 'present';
            if (status === 'present') present++;
            else absent++;
        });

        document.getElementById('attendanceSummaryContent').innerHTML = `
        <p><strong>Toplam:</strong> ${total} öğrenci</p>
        <p class="admin-attendance-summary__present"><strong>Var:</strong> ${present} öğrenci</p>
        <p class="admin-attendance-summary__absent"><strong>Yok:</strong> ${absent} öğrenci</p>
    `;
    }

    async function saveAttendance() {
        if (!currentAttendanceDate) {
            Utils.showError('Lütfen bir tarih seçin.');
            return;
        }

        const attendanceList = [];
        allStudentsForAttendance.forEach(s => {
            const radioButtons = document.querySelectorAll(`input[name="attendance_${s.id}"]`);
            let status = 'present';
            radioButtons.forEach(radio => {
                if (radio.checked) {
                    status = radio.value;
                }
            });
            attendanceList.push({
                student_id: s.id,
                status: status
            });
        });

        try {
            const response = await fetch(`${CONFIG.API_URL}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: currentAttendanceDate,
                    attendanceList: attendanceList
                })
            });

            if (!response.ok) {
                let errorMessage = 'Yoklama kaydedilirken hata oluştu';
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } catch (parseError) {
                        errorMessage = `Yoklama kaydedilirken hata oluştu (${response.status} ${response.statusText})`;
                    }
                } else {
                    try {
                        const errorText = await response.text();
                        errorMessage = errorText || errorMessage;
                    } catch (textError) {
                        errorMessage = `Yoklama kaydedilirken hata oluştu (${response.status} ${response.statusText})`;
                    }
                }
                Utils.showError(errorMessage);
                return;
            }

            await response.json();
            Utils.showSuccess('Yoklama başarıyla kaydedildi!');
            loadAttendanceForDate();
        } catch (e) {
            if (typeof logger !== 'undefined') { logger.error(COMPONENTS.ADMIN, 'Error saving attendance', e); }
            Utils.showError('Yoklama kaydedilirken hata oluştu.');
        }
    }

    function handleAttendanceActionClick(event) {
        const target = event.target;
        if (!target || typeof target.closest !== 'function') return;

        const actionButton = target.closest('[data-attendance-action]');
        if (!actionButton) return;

        const action = actionButton.dataset.attendanceAction;
        if (action === 'load') {
            loadAttendanceForDate();
        } else if (action === 'today') {
            setTodayDate();
        } else if (action === 'save') {
            saveAttendance();
        }
    }

    function handleAttendanceAvatarError(event) {
        const avatar = event.target;
        if (!avatar || !avatar.classList || !avatar.classList.contains('admin-attendance-avatar')) return;

        const defaultAvatar = avatar.getAttribute('data-default-avatar');
        if (!defaultAvatar) return;

        avatar.removeAttribute('data-default-avatar');
        avatar.src = defaultAvatar;
    }

    function init() {
        const attendanceSection = document.getElementById('attendance');
        if (attendanceSection) {
            attendanceSection.addEventListener('click', handleAttendanceActionClick);
        }

        const attendanceList = document.getElementById('attendanceList');
        if (attendanceList) {
            attendanceList.addEventListener('error', handleAttendanceAvatarError, true);
        }

        setTodayDate();
    }

    window.setTodayDate = setTodayDate;
    window.loadAttendanceForDate = loadAttendanceForDate;
    window.saveAttendance = saveAttendance;

    window.AdminAttendance = {
        init,
        setTodayDate,
        loadAttendanceForDate,
        renderAttendanceList,
        updateAttendanceSummary,
        saveAttendance
    };
})();
