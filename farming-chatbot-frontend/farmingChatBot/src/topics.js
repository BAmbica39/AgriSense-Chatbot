// topics.js - farming topics shown on the auth pages and as chat starters.
// Clicking an example sends it to the backend like a typed question.
import { BugIcon, DropletIcon, FlaskIcon, LayersIcon, ShieldIcon, SproutIcon } from './components/Icons';

const TOPICS = [
  { id: 'crops', label: 'Growing crops', Icon: SproutIcon, examples: ['How to grow tomatoes?', 'Best time to plant potatoes?'] },
  { id: 'diseases', label: 'Plant diseases', Icon: ShieldIcon, examples: ['How to treat leaf spot?', 'How to prevent root rot?'] },
  { id: 'pests', label: 'Pest control', Icon: BugIcon, examples: ['How to detect aphid infestation?', 'How to control mealybugs?'] },
  { id: 'water', label: 'Irrigation', Icon: DropletIcon, examples: ['How often should I water my crops?', 'What is drip irrigation?'] },
  { id: 'soil', label: 'Soil health', Icon: LayersIcon, examples: ['What is the pH range for healthy soil?', 'How to improve drainage in clay soil?'] },
  { id: 'fertilizer', label: 'Fertilizers', Icon: FlaskIcon, examples: ['What fertilizer is best for rice?', 'What is green manure?'] },
];

export default TOPICS;
