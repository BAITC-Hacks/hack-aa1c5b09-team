export interface User { id: string; name: string; email: string; specialty?: string; location?: string; bio?: string }
export interface ProfileInput { name: string; specialty: string; location: string; bio: string }
export interface ProviderProfile { id: string; name: string; specialty: string; location: string; bio: string }
export type RequestStatus = 'draft' | 'published' | 'selected';
export interface NeedCard {
  title: string;
  description: string;
  outcome: string;
  category: string;
  budget: string;
  deadline: string;
  format: string;
  location: string;
  requirements: string;
  materials: string;
  successCriteria: string;
  targetUsers: string;
  businessContact: string;
  consultationFormat: string;
  feedbackProcedure: string;
}
export type ReadinessCriterion = 'CONTEXT' | 'MATERIALS' | 'RESULT' | 'SUCCESS' | 'CONSTRAINTS' | 'USERS' | 'BUSINESS';
export type ReadinessLevel = 'NEEDS_CLARIFICATION' | 'WORKABLE' | 'READY' | 'PRIORITY';
export interface ReadinessRating {
  score: number;
  maxScore: number;
  level: ReadinessLevel;
  catalogPriority: number;
  criteria: { criterion: ReadinessCriterion; label: string; description: string; weight: number; filled: boolean; confirmed: boolean; points: number }[];
}
export interface AiMessage { id: string; role: 'assistant' | 'user'; text: string }
export interface NeedRequest {
  id: string;
  ownerId: string;
  status: RequestStatus;
  card: NeedCard;
  initialText: string;
  messages: AiMessage[];
  clarificationStep: number;
  readyForReview: boolean;
  createdAt: string;
  updatedAt: string;
  offerCount: number;
  selectedOfferId?: string;
  hasUnsavedCard?: boolean;
  revision?: number;
  readiness?: ReadinessRating;
}
export interface Offer {
  id: string;
  requestId: string;
  name: string;
  specialty: string;
  initials: string;
  color: string;
  description: string;
  price: string;
  duration: string;
  rating: number;
  reviews: number;
  providerId?: string;
  method?: string;
  createdAt?: string;
}
export interface PublicNeed {
  revision?: number;
  readiness?: ReadinessRating;
  id: string;
  ownerId: string;
  ownerName: string;
  status: 'published' | 'selected';
  card: NeedCard;
  createdAt: string;
  updatedAt: string;
  offerCount: number;
  selectedOfferId?: string;
}
export interface OfferInput { description: string; method: string; price: string; duration: string }
export type OfferStatus = 'pending' | 'accepted' | 'not_selected';
export interface MyOffer { offer: Offer; request: PublicNeed; status: OfferStatus }
export interface CatalogDetail { request: PublicNeed; myOffer: Offer | null }
export const offerStatusLabels: Record<OfferStatus, string> = { pending: 'Ожидает решения', accepted: 'Принято', not_selected: 'Выбран другой исполнитель' };
export interface ChatMessage {
  id: string;
  clientId?: string;
  offerId: string;
  sender: 'consumer' | 'provider';
  text: string;
  createdAt: string;
}
export interface Credentials { email: string; password: string }
export interface ClarificationInput { text: string; skip: boolean; clientId: string }
export interface Api {
  me(): Promise<User | null>;
  login(input: Credentials): Promise<User>;
  register(input: Credentials & { name: string }): Promise<User>;
  logout(): Promise<void>;
  updateProfile(input: ProfileInput): Promise<User>;
  getProviderProfile(id: string): Promise<ProviderProfile>;
  listRequests(): Promise<NeedRequest[]>;
  listCatalog(): Promise<PublicNeed[]>;
  getCatalogRequest(id: string): Promise<CatalogDetail>;
  createOffer(requestId: string, input: OfferInput, clientId: string): Promise<Offer>;
  listMyOffers(): Promise<MyOffer[]>;
  getRequest(id: string): Promise<NeedRequest>;
  createDraft(initialText: string, clientId: string): Promise<NeedRequest>;
  clarify(id: string, input: ClarificationInput): Promise<NeedRequest>;
  updateDraft(id: string, card: NeedCard, revision?: number): Promise<NeedRequest>;
  confirmReadiness(id: string, revision: number, confirmedCriteria: ReadinessCriterion[]): Promise<NeedRequest>;
  publish(id: string): Promise<NeedRequest>;
  getOffers(id: string): Promise<Offer[]>;
  selectOffer(requestId: string, offerId: string): Promise<NeedRequest>;
  getMessages(requestId: string, offerId: string): Promise<ChatMessage[]>;
  sendMessage(requestId: string, offerId: string, text: string, clientId: string): Promise<ChatMessage[]>;
}
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.name = 'ApiError'; this.status = status; }
}
export const emptyCard = (): NeedCard => ({ title: '', description: '', outcome: '', category: '', budget: '', deadline: '', format: '', location: '', requirements: '', materials: '', successCriteria: '', targetUsers: '', businessContact: '', consultationFormat: '', feedbackProcedure: '' });
export const statusLabels: Record<RequestStatus, string> = { draft: 'Черновик', published: 'Опубликована', selected: 'Исполнитель выбран' };
