export type Team = {
  id: number;
  name: string;
  logo: string;
  country: string;
  league: string;
};

// Lista principal para seleção no TIAGO ANALYSE PRO.
// Os escudos usam fontes públicas de imagem. Não depende de API key.
export const teams: Team[] = [
  // Copa 2026 - seleções
  { id: 26000, name: "México", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/mx.png" },
  { id: 26001, name: "África do Sul", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/za.png" },
  { id: 26002, name: "Coreia do Sul", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/kr.png" },
  { id: 26003, name: "Chéquia", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/cz.png" },
  { id: 26004, name: "Canadá", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/ca.png" },
  { id: 26005, name: "Catar", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/qa.png" },
  { id: 26006, name: "Suíça", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/ch.png" },
  { id: 26007, name: "Bósnia e Herzegovina", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/ba.png" },
  { id: 26008, name: "Brasil", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/br.png" },
  { id: 26009, name: "Marrocos", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/ma.png" },
  { id: 26010, name: "Haiti", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/ht.png" },
  { id: 26011, name: "Escócia", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/gb-sct.png" },
  { id: 26012, name: "Estados Unidos", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/us.png" },
  { id: 26013, name: "Paraguai", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/py.png" },
  { id: 26014, name: "Austrália", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/au.png" },
  { id: 26015, name: "Turquia", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/tr.png" },
  { id: 26016, name: "Alemanha", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/de.png" },
  { id: 26017, name: "Curaçao", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/cw.png" },
  { id: 26018, name: "Costa do Marfim", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/ci.png" },
  { id: 26019, name: "Equador", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/ec.png" },
  { id: 26020, name: "Países Baixos", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/nl.png" },
  { id: 26021, name: "Japão", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/jp.png" },
  { id: 26022, name: "Tunísia", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/tn.png" },
  { id: 26023, name: "Suécia", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/se.png" },
  { id: 26024, name: "Bélgica", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/be.png" },
  { id: 26025, name: "Egito", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/eg.png" },
  { id: 26026, name: "Irã", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/ir.png" },
  { id: 26027, name: "Nova Zelândia", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/nz.png" },
  { id: 26028, name: "Espanha", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/es.png" },
  { id: 26029, name: "Cabo Verde", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/cv.png" },
  { id: 26030, name: "Arábia Saudita", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/sa.png" },
  { id: 26031, name: "Uruguai", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/uy.png" },
  { id: 26032, name: "França", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/fr.png" },
  { id: 26033, name: "Senegal", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/sn.png" },
  { id: 26034, name: "Iraque", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/iq.png" },
  { id: 26035, name: "Noruega", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/no.png" },
  { id: 26036, name: "Argentina", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/ar.png" },
  { id: 26037, name: "Argélia", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/dz.png" },
  { id: 26038, name: "Áustria", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/at.png" },
  { id: 26039, name: "Jordânia", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/jo.png" },
  { id: 26040, name: "Portugal", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/pt.png" },
  { id: 26041, name: "Uzbequistão", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/uz.png" },
  { id: 26042, name: "Colômbia", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/co.png" },
  { id: 26043, name: "RD Congo", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/cd.png" },
  { id: 26044, name: "Inglaterra", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/gb-eng.png" },
  { id: 26045, name: "Croácia", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/hr.png" },
  { id: 26046, name: "Gana", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/gh.png" },
  { id: 26047, name: "Panamá", country: "Copa 2026", league: "Seleção", logo: "https://flagcdn.com/w80/pa.png" },

  // Brasil - Série A / principais
  { id: 127, name: "Flamengo", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/127.png" },
  { id: 121, name: "Palmeiras", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/121.png" },
  { id: 120, name: "Botafogo", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/120.png" },
  { id: 124, name: "Fluminense", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/124.png" },
  { id: 133, name: "Vasco", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/133.png" },
  { id: 131, name: "Corinthians", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/131.png" },
  { id: 126, name: "São Paulo", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/126.png" },
  { id: 128, name: "Santos", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/128.png" },
  { id: 130, name: "Grêmio", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/130.png" },
  { id: 119, name: "Internacional", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/119.png" },
  { id: 135, name: "Cruzeiro", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/135.png" },
  { id: 1062, name: "Atlético-MG", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/1062.png" },
  { id: 118, name: "Bahia", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/118.png" },
  { id: 154, name: "Fortaleza", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/154.png" },
  { id: 134, name: "Athletico-PR", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/134.png" },
  { id: 152, name: "Ceará", country: "Brasil", league: "Brasil", logo: "https://media.api-sports.io/football/teams/152.png" },
  { id: 151, name: "Sport Recife", country: "Brasil", league: "Brasil", logo: "https://media.api-sports.io/football/teams/151.png" },
  { id: 147, name: "Vitória", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/147.png" },
  { id: 155, name: "Juventude", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/155.png" },
  { id: 149, name: "Goiás", country: "Brasil", league: "Brasil", logo: "https://media.api-sports.io/football/teams/149.png" },
  { id: 144, name: "Coritiba", country: "Brasil", league: "Brasil", logo: "https://media.api-sports.io/football/teams/144.png" },
  { id: 145, name: "América-MG", country: "Brasil", league: "Brasil", logo: "https://media.api-sports.io/football/teams/145.png" },
  { id: 794, name: "Mirassol", country: "Brasil", league: "Brasil", logo: "https://media.api-sports.io/football/teams/794.png" },
  { id: 776, name: "Bragantino", country: "Brasil", league: "Brasileirão", logo: "https://media.api-sports.io/football/teams/776.png" },

  // Inglaterra - Premier League
  { id: 33, name: "Manchester United", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/33.png" },
  { id: 50, name: "Manchester City", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/50.png" },
  { id: 40, name: "Liverpool", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/40.png" },
  { id: 42, name: "Arsenal", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/42.png" },
  { id: 49, name: "Chelsea", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/49.png" },
  { id: 47, name: "Tottenham", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/47.png" },
  { id: 34, name: "Newcastle", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/34.png" },
  { id: 66, name: "Aston Villa", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/66.png" },
  { id: 48, name: "West Ham", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/48.png" },
  { id: 45, name: "Everton", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/45.png" },
  { id: 51, name: "Brighton", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/51.png" },
  { id: 52, name: "Crystal Palace", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/52.png" },
  { id: 55, name: "Fulham", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/55.png" },
  { id: 39, name: "Wolves", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/39.png" },

  // Espanha - La Liga
  { id: 541, name: "Real Madrid", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/541.png" },
  { id: 529, name: "Barcelona", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/529.png" },
  { id: 530, name: "Atlético de Madrid", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/530.png" },
  { id: 536, name: "Sevilla", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/536.png" },
  { id: 548, name: "Real Sociedad", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/548.png" },
  { id: 543, name: "Real Betis", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/543.png" },
  { id: 532, name: "Valencia", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/532.png" },
  { id: 533, name: "Villarreal", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/533.png" },
  { id: 531, name: "Athletic Bilbao", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/531.png" },

  // Itália - Serie A
  { id: 496, name: "Juventus", country: "Itália", league: "Serie A", logo: "https://media.api-sports.io/football/teams/496.png" },
  { id: 489, name: "AC Milan", country: "Itália", league: "Serie A", logo: "https://media.api-sports.io/football/teams/489.png" },
  { id: 505, name: "Inter de Milão", country: "Itália", league: "Serie A", logo: "https://media.api-sports.io/football/teams/505.png" },
  { id: 492, name: "Napoli", country: "Itália", league: "Serie A", logo: "https://media.api-sports.io/football/teams/492.png" },
  { id: 497, name: "Roma", country: "Itália", league: "Serie A", logo: "https://media.api-sports.io/football/teams/497.png" },
  { id: 487, name: "Lazio", country: "Itália", league: "Serie A", logo: "https://media.api-sports.io/football/teams/487.png" },
  { id: 499, name: "Atalanta", country: "Itália", league: "Serie A", logo: "https://media.api-sports.io/football/teams/499.png" },
  { id: 502, name: "Fiorentina", country: "Itália", league: "Serie A", logo: "https://media.api-sports.io/football/teams/502.png" },

  // Alemanha - Bundesliga
  { id: 157, name: "Bayern de Munique", country: "Alemanha", league: "Bundesliga", logo: "https://media.api-sports.io/football/teams/157.png" },
  { id: 165, name: "Borussia Dortmund", country: "Alemanha", league: "Bundesliga", logo: "https://media.api-sports.io/football/teams/165.png" },
  { id: 173, name: "RB Leipzig", country: "Alemanha", league: "Bundesliga", logo: "https://media.api-sports.io/football/teams/173.png" },
  { id: 168, name: "Bayer Leverkusen", country: "Alemanha", league: "Bundesliga", logo: "https://media.api-sports.io/football/teams/168.png" },
  { id: 169, name: "Eintracht Frankfurt", country: "Alemanha", league: "Bundesliga", logo: "https://media.api-sports.io/football/teams/169.png" },
  { id: 182, name: "Stuttgart", country: "Alemanha", league: "Bundesliga", logo: "https://media.api-sports.io/football/teams/182.png" },

  // França - Ligue 1
  { id: 85, name: "PSG", country: "França", league: "Ligue 1", logo: "https://media.api-sports.io/football/teams/85.png" },
  { id: 81, name: "Marseille", country: "França", league: "Ligue 1", logo: "https://media.api-sports.io/football/teams/81.png" },
  { id: 80, name: "Lyon", country: "França", league: "Ligue 1", logo: "https://media.api-sports.io/football/teams/80.png" },
  { id: 91, name: "Monaco", country: "França", league: "Ligue 1", logo: "https://media.api-sports.io/football/teams/91.png" },
  { id: 94, name: "Lille", country: "França", league: "Ligue 1", logo: "https://media.api-sports.io/football/teams/94.png" },
  { id: 116, name: "Nice", country: "França", league: "Ligue 1", logo: "https://media.api-sports.io/football/teams/116.png" },

  // Portugal
  { id: 211, name: "Benfica", country: "Portugal", league: "Liga Portugal", logo: "https://media.api-sports.io/football/teams/211.png" },
  { id: 212, name: "Porto", country: "Portugal", league: "Liga Portugal", logo: "https://media.api-sports.io/football/teams/212.png" },
  { id: 228, name: "Sporting", country: "Portugal", league: "Liga Portugal", logo: "https://media.api-sports.io/football/teams/228.png" },
  { id: 217, name: "Braga", country: "Portugal", league: "Liga Portugal", logo: "https://media.api-sports.io/football/teams/217.png" },

  // Argentina / Libertadores
  { id: 435, name: "Boca Juniors", country: "Argentina", league: "Libertadores", logo: "https://media.api-sports.io/football/teams/435.png" },
  { id: 436, name: "River Plate", country: "Argentina", league: "Libertadores", logo: "https://media.api-sports.io/football/teams/436.png" },
  { id: 442, name: "Racing Club", country: "Argentina", league: "Libertadores", logo: "https://media.api-sports.io/football/teams/442.png" },
  { id: 439, name: "Independiente", country: "Argentina", league: "Libertadores", logo: "https://media.api-sports.io/football/teams/439.png" },
  { id: 445, name: "San Lorenzo", country: "Argentina", league: "Libertadores", logo: "https://media.api-sports.io/football/teams/445.png" },
  { id: 450, name: "Estudiantes", country: "Argentina", league: "Libertadores", logo: "https://media.api-sports.io/football/teams/450.png" },

  // Outros relevantes
  { id: 194, name: "Ajax", country: "Holanda", league: "Eredivisie", logo: "https://media.api-sports.io/football/teams/194.png" },
  { id: 197, name: "PSV", country: "Holanda", league: "Eredivisie", logo: "https://media.api-sports.io/football/teams/197.png" },
  { id: 201, name: "Feyenoord", country: "Holanda", league: "Eredivisie", logo: "https://media.api-sports.io/football/teams/201.png" },
  { id: 611, name: "Al Hilal", country: "Arábia Saudita", league: "Saudi Pro League", logo: "https://media.api-sports.io/football/teams/611.png" },
  { id: 2939, name: "Inter Miami", country: "Estados Unidos", league: "MLS", logo: "https://media.api-sports.io/football/teams/2939.png" } ,
  // Inglaterra - clubes adicionais
  { id: 35, name: "Bournemouth", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/35.png" },
  { id: 36, name: "Brentford", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/36.png" },
  { id: 57, name: "Nottingham Forest", country: "Inglaterra", league: "Premier League", logo: "https://media.api-sports.io/football/teams/57.png" },
  { id: 65, name: "Leicester", country: "Inglaterra", league: "Championship", logo: "https://media.api-sports.io/football/teams/65.png" },
  { id: 71, name: "Leeds United", country: "Inglaterra", league: "Championship", logo: "https://media.api-sports.io/football/teams/71.png" },

  // Espanha - clubes adicionais
  { id: 542, name: "Alavés", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/542.png" },
  { id: 546, name: "Getafe", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/546.png" },
  { id: 547, name: "Girona", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/547.png" },
  { id: 727, name: "Mallorca", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/727.png" },
  { id: 798, name: "Osasuna", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/798.png" },
  { id: 539, name: "Celta Vigo", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/539.png" },
  { id: 540, name: "Espanyol", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/540.png" },
  { id: 728, name: "Rayo Vallecano", country: "Espanha", league: "La Liga", logo: "https://media.api-sports.io/football/teams/728.png" },

  // Itália - clubes adicionais
  { id: 494, name: "Udinese", country: "Itália", league: "Serie A", logo: "https://media.api-sports.io/football/teams/494.png" },
  { id: 504, name: "Torino", country: "Itália", league: "Serie A", logo: "https://media.api-sports.io/football/teams/504.png" },
  { id: 488, name: "Sassuolo", country: "Itália", league: "Serie A", logo: "https://media.api-sports.io/football/teams/488.png" },
  { id: 500, name: "Bologna", country: "Itália", league: "Serie A", logo: "https://media.api-sports.io/football/teams/500.png" },
  { id: 503, name: "Genoa", country: "Itália", league: "Serie A", logo: "https://media.api-sports.io/football/teams/503.png" },
  { id: 495, name: "Cagliari", country: "Itália", league: "Serie A", logo: "https://media.api-sports.io/football/teams/495.png" },

  // Alemanha - clubes adicionais
  { id: 161, name: "Wolfsburg", country: "Alemanha", league: "Bundesliga", logo: "https://media.api-sports.io/football/teams/161.png" },
  { id: 164, name: "Mainz", country: "Alemanha", league: "Bundesliga", logo: "https://media.api-sports.io/football/teams/164.png" },
  { id: 167, name: "Hoffenheim", country: "Alemanha", league: "Bundesliga", logo: "https://media.api-sports.io/football/teams/167.png" },
  { id: 170, name: "Freiburg", country: "Alemanha", league: "Bundesliga", logo: "https://media.api-sports.io/football/teams/170.png" },
  { id: 172, name: "Werder Bremen", country: "Alemanha", league: "Bundesliga", logo: "https://media.api-sports.io/football/teams/172.png" },
  { id: 163, name: "Borussia Mönchengladbach", country: "Alemanha", league: "Bundesliga", logo: "https://media.api-sports.io/football/teams/163.png" },

  // França - clubes adicionais
  { id: 79, name: "Nantes", country: "França", league: "Ligue 1", logo: "https://media.api-sports.io/football/teams/79.png" },
  { id: 82, name: "Montpellier", country: "França", league: "Ligue 1", logo: "https://media.api-sports.io/football/teams/82.png" },
  { id: 83, name: "Reims", country: "França", league: "Ligue 1", logo: "https://media.api-sports.io/football/teams/83.png" },
  { id: 84, name: "Rennes", country: "França", league: "Ligue 1", logo: "https://media.api-sports.io/football/teams/84.png" },
  { id: 93, name: "Toulouse", country: "França", league: "Ligue 1", logo: "https://media.api-sports.io/football/teams/93.png" },
  { id: 95, name: "Strasbourg", country: "França", league: "Ligue 1", logo: "https://media.api-sports.io/football/teams/95.png" },

  // Brasil Série B / relevantes
  { id: 146, name: "Avaí", country: "Brasil", league: "Série B", logo: "https://media.api-sports.io/football/teams/146.png" },
  { id: 148, name: "Ponte Preta", country: "Brasil", league: "Série B", logo: "https://media.api-sports.io/football/teams/148.png" },
  { id: 153, name: "Criciúma", country: "Brasil", league: "Série B", logo: "https://media.api-sports.io/football/teams/153.png" },
  { id: 777, name: "Chapecoense", country: "Brasil", league: "Série B", logo: "https://media.api-sports.io/football/teams/777.png" },
  { id: 783, name: "CRB", country: "Brasil", league: "Série B", logo: "https://media.api-sports.io/football/teams/783.png" },
  { id: 784, name: "CSA", country: "Brasil", league: "Série B", logo: "https://media.api-sports.io/football/teams/784.png" },
  { id: 785, name: "Náutico", country: "Brasil", league: "Série B", logo: "https://media.api-sports.io/football/teams/785.png" },
  { id: 789, name: "Operário-PR", country: "Brasil", league: "Série B", logo: "https://media.api-sports.io/football/teams/789.png" },
  { id: 790, name: "Vila Nova", country: "Brasil", league: "Série B", logo: "https://media.api-sports.io/football/teams/790.png" },

  // México / EUA / outros populares
  { id: 2279, name: "América-MEX", country: "México", league: "Liga MX", logo: "https://media.api-sports.io/football/teams/2279.png" },
  { id: 2280, name: "Chivas", country: "México", league: "Liga MX", logo: "https://media.api-sports.io/football/teams/2280.png" },
  { id: 2287, name: "Tigres UANL", country: "México", league: "Liga MX", logo: "https://media.api-sports.io/football/teams/2287.png" },
  { id: 1608, name: "Los Angeles FC", country: "Estados Unidos", league: "MLS", logo: "https://media.api-sports.io/football/teams/1608.png" },
  { id: 1609, name: "LA Galaxy", country: "Estados Unidos", league: "MLS", logo: "https://media.api-sports.io/football/teams/1609.png" },
  { id: 9568, name: "Al Nassr", country: "Arábia Saudita", league: "Saudi Pro League", logo: "https://media.api-sports.io/football/teams/9568.png" }

];

export function getTeamLogo(teamName: string) {
  return getTeamLogoCandidates(teamName)[0];
}

function proxyApiSportsLogo(url: string) {
  if (!url) return url;
  if (url.startsWith("/api/football/logo")) return url;
  if (url.includes("media.api-sports.io")) return `/api/football/logo?url=${encodeURIComponent(url)}`;
  return url;
}

export function getTeamLogoCandidates(teamName: string) {
  const normalized = teamName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const team = teams.find((item) => {
    const candidate = item.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    return candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate);
  });

  if (!team) return [`/api/brasileirao/logo/${encodeURIComponent(teamName)}`, "/teams/default.svg", "/favicon.png"];

  const isApiSportsTeam = team.logo?.includes("media.api-sports.io/football/teams/");
  const isNationalFlag = team.logo?.includes("flagcdn.com") || team.league === "Seleção" || team.country === "Copa 2026";
  const official = isApiSportsTeam && team.id ? `https://media.api-sports.io/football/teams/${team.id}.png` : "";

  const candidates = isNationalFlag
    ? [
        team.logo || undefined,
        "/teams/default.svg",
        "/favicon.png",
      ].filter(Boolean) as string[]
    : [
        official ? proxyApiSportsLogo(official) : undefined,
        team.logo ? proxyApiSportsLogo(team.logo) : undefined,
        official || undefined,
        team.logo || undefined,
        `/api/brasileirao/logo/${encodeURIComponent(team.name)}`,
        "/teams/default.svg",
        "/favicon.png",
      ].filter(Boolean) as string[];

  return [...new Set(candidates)];
}

export function getTeamInitials(teamName: string) {
  return teamName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function getTeamsByLeague() {
  return teams.reduce<Record<string, Team[]>>((groups, team) => {
    const key = `${team.country} - ${team.league}`;
    groups[key] = groups[key] || [];
    groups[key].push(team);
    return groups;
  }, {});
}
