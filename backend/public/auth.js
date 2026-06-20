// Shared auth helper for all pages. Stores our session JWT + doctor profile in
// localStorage, adds the Authorization header to API calls, and guards pages.
(function () {
  const TOKEN_KEY = "adp_token";
  const DOCTOR_KEY = "adp_doctor";

  const Auth = {
    token: () => localStorage.getItem(TOKEN_KEY),
    doctor() {
      try { return JSON.parse(localStorage.getItem(DOCTOR_KEY) || "null"); } catch { return null; }
    },
    setSession(token, doctor) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(DOCTOR_KEY, JSON.stringify(doctor || {}));
    },
    clear() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(DOCTOR_KEY);
    },
    logout() {
      Auth.clear();
      location.href = "/login";
    },

    // fetch() with the bearer token attached. On 401 it clears the session and
    // bounces to the login page.
    async fetch(url, opts = {}) {
      const headers = Object.assign({}, opts.headers, {
        Authorization: "Bearer " + (Auth.token() || ""),
      });
      const res = await fetch(url, Object.assign({}, opts, { headers }));
      if (res.status === 401) {
        Auth.clear();
        location.href = "/login";
        throw new Error("Session expired");
      }
      return res;
    },

    // Call at the top of a gated page. Verifies the token with the server and
    // returns the doctor profile (or redirects to /login).
    async requireLogin() {
      if (!Auth.token()) { location.href = "/login"; return null; }
      try {
        const res = await Auth.fetch("/api/auth/me");
        if (!res.ok) throw new Error();
        const { doctor } = await res.json();
        localStorage.setItem(DOCTOR_KEY, JSON.stringify(doctor));
        return doctor;
      } catch {
        Auth.clear();
        location.href = "/login";
        return null;
      }
    },

    // Render avatar + name (opens profile) + logout into a container element.
    renderUserChip(el) {
      const d = Auth.doctor() || {};
      el.innerHTML =
        `<button class="u-profile" type="button" title="Profile & settings">` +
        (d.picture ? `<img class="u-pic" src="${d.picture}" alt="" referrerpolicy="no-referrer" />` : "") +
        `<span class="u-name">${d.name || d.email || "Doctor"}</span>` +
        `<span class="u-gear">⚙</span></button>` +
        `<button class="logout" type="button">Logout</button>`;
      el.querySelector(".u-profile").onclick = () => Auth.openProfile();
      el.querySelector(".logout").onclick = Auth.logout;
    },

    // Profile modal: shows the Google identity (read-only) + editable clinic name.
    openProfile() {
      let m = document.getElementById("profileModal");
      if (!m) {
        m = document.createElement("div");
        m.id = "profileModal";
        m.className = "modal";
        m.hidden = true;
        m.innerHTML =
          '<div class="modal-card">' +
          '<button class="modal-x" type="button" aria-label="Close">×</button>' +
          "<h3>Your profile</h3>" +
          '<div class="profile-id">' +
          '<img class="pf-pic" referrerpolicy="no-referrer" alt="" />' +
          '<div><div class="pf-name"></div><div class="pf-email muted"></div></div>' +
          "</div>" +
          '<form class="form" id="profileForm">' +
          "<label>Clinic / Hospital name" +
          '<input name="clinicName" placeholder="e.g. Arogya Ayurveda" maxlength="120" /></label>' +
          '<p class="hint">Appears as the header on your printed diet-chart PDFs.</p>' +
          "<label>Standard advice (printed on every plan)" +
          '<textarea name="defaultAdvice" rows="3" maxlength="1000" placeholder="e.g. Drink warm water. Avoid curd at night. Eat at regular times."></textarea></label>' +
          '<p class="hint">Always printed under “General Advice”. Any extra advice you type on the planner is added below it.</p>' +
          '<p class="pf-msg" hidden></p>' +
          '<div class="actions">' +
          '<button class="btn primary" type="submit">Save</button>' +
          '<button class="btn ghost" type="button" id="pfCancel">Cancel</button>' +
          "</div></form></div>";
        document.body.appendChild(m);
        const close = () => (m.hidden = true);
        m.querySelector(".modal-x").onclick = close;
        m.querySelector("#pfCancel").onclick = close;
        m.addEventListener("click", (e) => { if (e.target.id === "profileModal") close(); });
        m.querySelector("#profileForm").addEventListener("submit", saveProfile);
      }
      const d = Auth.doctor() || {};
      const pic = m.querySelector(".pf-pic");
      pic.src = d.picture || "";
      pic.style.display = d.picture ? "" : "none";
      m.querySelector(".pf-name").textContent = d.name || "Doctor";
      m.querySelector(".pf-email").textContent = d.email || "";
      m.querySelector("#profileForm [name=clinicName]").value = d.clinicName || "";
      m.querySelector("#profileForm [name=defaultAdvice]").value = d.defaultAdvice || "";
      const msg = m.querySelector(".pf-msg");
      msg.hidden = true; msg.textContent = "";
      m.hidden = false;
    },
  };

  async function saveProfile(e) {
    e.preventDefault();
    const m = document.getElementById("profileModal");
    const msg = m.querySelector(".pf-msg");
    const btn = e.submitter || m.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const clinicName = m.querySelector("[name=clinicName]").value.trim();
      const defaultAdvice = m.querySelector("[name=defaultAdvice]").value.trim();
      const res = await Auth.fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicName, defaultAdvice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");

      const cur = Auth.doctor() || {};
      localStorage.setItem("adp_doctor", JSON.stringify(Object.assign(cur, data.doctor)));
      // Let the current page react (e.g. prefill the clinic field on the planner).
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: data.doctor }));

      msg.textContent = "Saved ✓"; msg.className = "pf-msg ok"; msg.hidden = false;
      setTimeout(() => (m.hidden = true), 800);
    } catch (err) {
      msg.textContent = err.message; msg.className = "pf-msg err"; msg.hidden = false;
    } finally {
      btn.disabled = false;
    }
  }

  window.Auth = Auth;
})();
