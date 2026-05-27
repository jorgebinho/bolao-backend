const fs = require('fs');
const path = require('path');

const WORLDCUP_DATA_DIR = path.resolve(__dirname, '..', '..', 'data', 'worldcup');
const TEAMS_PT_BR_PATH = process.env.WORLDCUP_TEAMS_PT_BR_PATH || path.join(WORLDCUP_DATA_DIR, 'teams_pt_br_updated.csv');

function readCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').trim();
  const [headerLine, ...lines] = content.split(/\r?\n/);
  const headers = headerLine.split(',');

  return lines
    .filter(Boolean)
    .map((line) => {
      const values = line.split(',');
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    });
}

function getWorldCupTeams() {
  return readCsv(TEAMS_PT_BR_PATH)
    .filter((team) => team.is_placeholder !== 'True')
    .map((team) => ({
      id: Number(team.id),
      name: team.team_name,
      fifaCode: team.fifa_code,
      group: team.group_letter,
    }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
}

module.exports = {
  getWorldCupTeams,
  TEAMS_PT_BR_PATH,
};
