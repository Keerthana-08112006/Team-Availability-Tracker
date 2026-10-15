const teamList = document.getElementById("teamList");
const teamCount = document.getElementById("teamCount");
const availableCount = document.getElementById("availableCount");
const busyCount = document.getElementById("busyCount");
const awayCount = document.getElementById("awayCount");
const message = document.getElementById("message");

let updating = false;

async function loadTeam() {
  try {
    const response = await fetch("/api/team");

    if (!response.ok) {
      throw new Error("Unable to load team members.");
    }

    const members = await response.json();

    availableCount.textContent = members.filter(
      member => member.status === "Available"
    ).length;

    busyCount.textContent = members.filter(
      member => member.status === "Busy"
    ).length;

    awayCount.textContent = members.filter(
      member => member.status === "Away"
    ).length;

    teamCount.textContent =
      `${members.length} member${members.length === 1 ? "" : "s"}`;

    const currentSelections = new Map(
      [...teamList.querySelectorAll("select[data-id]")].map(select => [
        select.dataset.id,
        select.value
      ])
    );

    teamList.replaceChildren();

    members.forEach(member => {
      const card = document.createElement("article");
      card.className = "member-card";

      const info = document.createElement("div");
      info.className = "member-info";

      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = member.name.charAt(0).toUpperCase();

      const details = document.createElement("div");

      const name = document.createElement("p");
      name.className = "member-name";
      name.textContent = member.name;

      const role = document.createElement("p");
      role.className = "member-role";
      role.textContent = member.role;

      details.append(name, role);
      info.append(avatar, details);

      const statusRow = document.createElement("div");
      statusRow.className = "status-row";

      const badge = document.createElement("span");
      badge.className = `status-badge status-${member.status}`;
      badge.textContent = member.status;

      const select = document.createElement("select");
      select.dataset.id = member.id;
      select.setAttribute(
        "aria-label",
        `Availability status for ${member.name}`
      );

      ["Available", "Busy", "Away"].forEach(status => {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status;
        select.appendChild(option);
      });

      select.value = currentSelections.get(String(member.id)) || member.status;
      select.disabled = updating;

      select.addEventListener("change", async () => {
        const newStatus = select.value;
        select.disabled = true;
        message.textContent = "Updating status...";

        try {
          const result = await fetch(`/api/team/${member.id}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: newStatus })
          });

          const data = await result.json();

          if (!result.ok) {
            throw new Error(data.error || "Unable to update status.");
          }

          message.textContent = `${member.name}'s status updated to ${newStatus}.`;
          await loadTeam();
        } catch (error) {
          message.textContent = error.message;
          await loadTeam();
        }
      });

      statusRow.append(badge, select);
      card.append(info, statusRow);
      teamList.appendChild(card);
    });
  } catch (error) {
    message.textContent = error.message;
  }
}

loadTeam();
setInterval(loadTeam, 5000);