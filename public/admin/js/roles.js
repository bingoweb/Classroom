(function () {
    let refreshRoles = () => {};

    function updateRoleSelects(students) {
        const options = students.map(s => `<option value="${s.id}">${Utils.escapeHtml(s.name)}</option>`).join('');
        document.getElementById('presidentSelect').innerHTML = options;
        document.getElementById('vicePresidentSelect').innerHTML = options;
        document.getElementById('dutySelect').innerHTML = options;
        document.getElementById('starSelect').innerHTML = options;
    }

    async function assignRole(roleType) {
        let studentId;
        if (roleType === 'president') studentId = document.getElementById('presidentSelect').value;
        if (roleType === 'vice_president') studentId = document.getElementById('vicePresidentSelect').value;
        if (roleType === 'duty') studentId = document.getElementById('dutySelect').value;
        if (roleType === 'star') studentId = document.getElementById('starSelect').value;

        if (!studentId) {
            Utils.showError('Lütfen bir öğrenci seçin.');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: studentId, role_type: roleType })
            });

            const data = await response.json();

            if (!response.ok) {
                Utils.showError(data.error || 'Rol atanırken hata oluştu');
                return;
            }

            Utils.showSuccess(data.message || 'Rol başarıyla atandı!');
            refreshRoles();
        } catch (e) {
            if (typeof logger !== 'undefined') {
                logger.error(COMPONENTS.ADMIN, 'Error assigning role', e);
            }
            Utils.showError('Görev atama sırasında hata oluştu.');
        }
    }

    function renderRoles(roles) {
        const president = roles.find(r => r.role_type === 'president');
        const presidentHtml = president ?
            `✅ ${Utils.escapeHtml(president.name)} <button class="remove-role-btn" data-id="${president.role_id}">Kaldır</button>` : '---';
        document.getElementById('currentPresident').innerHTML = presidentHtml;

        const vicePresidents = roles.filter(r => r.role_type === 'vice_president');
        document.getElementById('currentVicePresidents').innerHTML = vicePresidents.map(vp => {
            return `<div>👑 ${Utils.escapeHtml(vp.name)} <button class="remove-role-btn" data-id="${vp.role_id}">Kaldır</button></div>`;
        }).join('') || '---';

        const duties = roles.filter(r => r.role_type === 'duty');
        document.getElementById('currentDuty').innerHTML = duties.map(d => {
            return `<div>📋 ${Utils.escapeHtml(d.name)} <button class="remove-role-btn" data-id="${d.role_id}">Kaldır</button></div>`;
        }).join('');

        const stars = roles.filter(r => r.role_type === 'star');
        document.getElementById('currentStars').innerHTML = stars.map(s => {
            return `<div>⭐ ${Utils.escapeHtml(s.name)} <button class="remove-role-btn" data-id="${s.role_id}">Kaldır</button></div>`;
        }).join('');
    }

    async function removeRole(roleId) {
        if (!confirm('Bu rolü kaldırmak istediğinize emin misiniz?')) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/roles/${roleId}`, { method: 'DELETE' });

            if (!response.ok) {
                let errorMessage = 'Rol kaldırılırken hata oluştu';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (parseError) {
                    try {
                        const errorText = await response.text();
                        errorMessage = errorText || errorMessage;
                    } catch (textError) {
                        // Silent - nested error
                    }
                }
                Utils.showError(errorMessage);
                return;
            }

            try {
                await response.json();
            } catch (parseError) {
                Utils.showSuccess('Rol başarıyla kaldırıldı!');
                refreshRoles();
                return;
            }

            Utils.showSuccess('Rol başarıyla kaldırıldı!');
            refreshRoles();
        } catch (e) {
            if (typeof logger !== 'undefined') {
                logger.error(COMPONENTS.ADMIN, 'Error removing role', e, { roleId });
            }
            Utils.showError('Rol kaldırılırken hata oluştu.');
        }
    }

    function init(options = {}) {
        if (typeof options.refreshRoles === 'function') {
            refreshRoles = options.refreshRoles;
        }

        const rolesSection = document.getElementById('roles');
        if (rolesSection) {
            rolesSection.addEventListener('click', function (e) {
                const assignButton = e.target && typeof e.target.closest === 'function'
                    ? e.target.closest('.assign-role-btn')
                    : null;
                if (assignButton) {
                    const roleType = assignButton.dataset.roleType;
                    if (roleType) {
                        assignRole(roleType);
                    }
                    return;
                }

                if (e.target && e.target.classList.contains('remove-role-btn')) {
                    const id = e.target.getAttribute('data-id');
                    window.removeRole(id);
                }
            });
        }
    }

    window.assignRole = assignRole;
    window.removeRole = removeRole;

    window.AdminRoles = {
        init,
        updateRoleSelects,
        renderRoles,
        assignRole,
        removeRole
    };
})();
