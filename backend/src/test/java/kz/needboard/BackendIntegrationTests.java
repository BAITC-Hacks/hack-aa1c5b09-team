package kz.needboard;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import kz.needboard.common.ApiException;
import kz.needboard.proposals.ProposalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BackendIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired ProposalService proposals;

    @BeforeEach
    void cleanDatabase() {
        jdbc.execute("truncate table users, needs, need_acceptance_criteria, proposals cascade");
    }

    @Test
    void registrationNormalizesEmailHashesPasswordAndRejectsDuplicates() throws Exception {
        var response = mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json")
                .content(json.writeValueAsString(Map.of("email", "OWNER@example.com",
                        "password", "Password-123", "displayName", "Owner"))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.email").value("owner@example.com"))
                .andExpect(jsonPath("$.password").doesNotExist()).andReturn();
        String hash = jdbc.queryForObject("select password_hash from users", String.class);
        assertThat(hash).startsWith("$2").isNotEqualTo("Password-123");
        mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json")
                .content(json.writeValueAsString(Map.of("email", "owner@example.com",
                        "password", "Password-123", "displayName", "Duplicate"))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("EMAIL_EXISTS"));
        assertThat(body(response).path("id").asText()).isNotBlank();
    }

    @Test
    void browserSessionRequiresCsrfRotatesItAfterLoginAndLogsOut() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/register").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CSRF_INVALID"));
        var initial = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn();
        var session = (MockHttpSession) initial.getRequest().getSession(false);
        String header = body(initial).path("headerName").asText();
        String token = body(initial).path("token").asText();
        var credentials = Map.of("email", "owner@example.com", "password", "Password-123", "displayName", "Owner");
        mvc.perform(post("/api/auth/register").session(session).header(header, token)
                .contentType("application/json").content(json.writeValueAsString(credentials)))
                .andExpect(status().isCreated());
        String oldSessionId = session.getId();
        mvc.perform(post("/api/auth/login").session(session).header(header, token).contentType("application/json")
                .content(json.writeValueAsString(Map.of("email", "owner@example.com", "password", "Password-123"))))
                .andExpect(status().isOk());
        assertThat(session.getId()).isNotEqualTo(oldSessionId);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("owner@example.com"));
        mvc.perform(post("/api/needs").session(session).header(header, token)
                .contentType("application/json").content(needPayload()))
                .andExpect(status().isForbidden());
        var renewed = mvc.perform(get("/api/auth/csrf").session(session)).andReturn();
        String newToken = body(renewed).path("token").asText();
        mvc.perform(post("/api/needs").session(session).header(header, newToken)
                .contentType("application/json").content(needPayload())).andExpect(status().isCreated());
        mvc.perform(post("/api/auth/logout").session(session).header(header, newToken))
                .andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void incorrectPasswordDoesNotAuthenticate() throws Exception {
        account("owner");
        mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json")
                .content(json.writeValueAsString(Map.of("email", "owner@example.com", "password", "wrong-password"))))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void profileUpdatesRequireOwnerAndPublicProviderViewHidesEmail() throws Exception {
        var owner = account("owner");
        var outsider = account("outsider");
        String path = "/api/providers/" + owner.id();
        mvc.perform(get(path)).andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("owner"))
                .andExpect(jsonPath("$.email").doesNotExist());
        var payload = json.writeValueAsString(Map.of("displayName", "Новый автор", "specialty", "Дизайн",
                "location", "Алматы", "bio", "Создаю понятные решения."));
        mvc.perform(put("/api/auth/me").with(csrf()).contentType("application/json").content(payload))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/auth/me").session(owner.session()).contentType("application/json").content(payload))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/auth/me").session(owner.session()).with(csrf())
                .contentType("application/json").content(payload)).andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Новый автор"))
                .andExpect(jsonPath("$.email").value("owner@example.com"));
        mvc.perform(get("/api/auth/me").session(owner.session())).andExpect(status().isOk())
                .andExpect(jsonPath("$.bio").value("Создаю понятные решения."));
        mvc.perform(get(path)).andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Новый автор"))
                .andExpect(jsonPath("$.specialty").value("Дизайн"))
                .andExpect(jsonPath("$.location").value("Алматы"))
                .andExpect(jsonPath("$.email").doesNotExist());
        mvc.perform(get("/api/auth/me").session(outsider.session())).andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("outsider"));
        mvc.perform(put("/api/auth/me").session(owner.session()).with(csrf())
                .contentType("application/json").content("{\"displayName\":\"x\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void multibytePasswordLimitIsValidatedInBothRegistrationAndLogin() throws Exception {
        String longPassword = "я".repeat(40);
        mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json")
                .content(json.writeValueAsString(Map.of("email", "owner@example.com",
                        "password", longPassword, "displayName", "Owner"))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.password").exists());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json")
                .content(json.writeValueAsString(Map.of("email", "owner@example.com", "password", longPassword))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    void draftIsPrivateAndPublicationRequiresCompleteFields() throws Exception {
        var owner = account("owner");
        var outsider = account("outsider");
        var created = mvc.perform(post("/api/needs").session(owner.session()).with(csrf())
                .contentType("application/json").content("{\"originalDescription\":\"private original\",\"card\":{}}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("DRAFT")).andReturn();
        String id = body(created).path("id").asText();
        mvc.perform(get("/api/needs/" + id)).andExpect(status().isNotFound());
        mvc.perform(get("/api/needs/" + id).session(outsider.session())).andExpect(status().isNotFound());
        mvc.perform(get("/api/needs")).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(post("/api/needs/" + id + "/publish").session(owner.session()).with(csrf()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors['card.title']").exists());
        mvc.perform(put("/api/needs/" + id).session(owner.session()).with(csrf())
                .contentType("application/json").content(needPayload())).andExpect(status().isOk());
        mvc.perform(post("/api/needs/" + id + "/publish").session(owner.session()).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PUBLISHED"));
        mvc.perform(get("/api/needs/" + id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.originalDescription").doesNotExist());
        mvc.perform(get("/api/needs/" + id).session(owner.session())).andExpect(status().isOk())
                .andExpect(jsonPath("$.originalDescription").value("private original"));
        mvc.perform(put("/api/needs/" + id).session(owner.session()).with(csrf())
                .contentType("application/json").content(needPayload())).andExpect(status().isConflict());
    }

    @Test
    void outsidersCannotEditOrPublishAndCannotSetServerOwnedFields() throws Exception {
        var owner = account("owner");
        var outsider = account("outsider");
        UUID id = createDraft(owner);
        mvc.perform(put("/api/needs/" + id).session(outsider.session()).with(csrf())
                .contentType("application/json").content(needPayload())).andExpect(status().isForbidden());
        mvc.perform(post("/api/needs/" + id + "/publish").session(outsider.session()).with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/needs").session(owner.session()).with(csrf()).contentType("application/json")
                .content("{\"ownerId\":\"" + outsider.id() + "\",\"status\":\"PUBLISHED\",\"card\":{}}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void onlyPublishedForeignNeedsAcceptProposalsAndDuplicatesAreRejected() throws Exception {
        var owner = account("owner");
        var author = account("author");
        UUID id = createDraft(owner);
        mvc.perform(proposalRequest(id, author)).andExpect(status().isConflict());
        publish(id, owner);
        mvc.perform(proposalRequest(id, owner)).andExpect(status().isForbidden());
        mvc.perform(post("/api/needs/" + id + "/proposals").with(csrf())
                .contentType("application/json").content(proposalPayload())).andExpect(status().isUnauthorized());
        mvc.perform(proposalRequest(id, author)).andExpect(status().isCreated());
        mvc.perform(proposalRequest(id, author)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PROPOSAL_EXISTS"));
    }

    @Test
    void proposalRequiresSolutionAndPriceAndScheduleTerms() throws Exception {
        var owner = account("owner");
        var author = account("author");
        UUID id = createPublished(owner);
        mvc.perform(post("/api/needs/" + id + "/proposals").session(author.session()).with(csrf())
                .contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/needs/" + id + "/proposals").session(author.session()).with(csrf())
                .contentType("application/json").content(json.writeValueAsString(Map.of(
                        "solutionDescription", "Solution", "implementationPlan", "Plan", "expectedResult", "Result"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.priceNote").exists())
                .andExpect(jsonPath("$.fieldErrors.scheduleNote").exists());
        mvc.perform(post("/api/needs/" + id + "/proposals").session(author.session()).with(csrf())
                .contentType("application/json").content(json.writeValueAsString(Map.of(
                        "solutionDescription", "Solution", "implementationPlan", "Plan", "expectedResult", "Result",
                        "priceNote", "After requirements review", "scheduleNote", "After receiving materials"))))
                .andExpect(status().isCreated());
    }

    @Test
    void onlyOwnerSeesAllProposalsAndSelectsExactlyOne() throws Exception {
        var owner = account("owner");
        var first = account("first");
        var second = account("second");
        var third = account("third");
        UUID need = createPublished(owner);
        UUID p1 = createProposal(need, first);
        UUID p2 = createProposal(need, second);
        mvc.perform(get("/api/needs/" + need + "/proposals").session(first.session()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/needs/" + need + "/proposals").session(owner.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(get("/api/me/proposals").session(first.session()))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].id").value(p1.toString()));
        mvc.perform(post("/api/proposals/" + p1 + "/accept").session(first.session()).with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/proposals/" + p1 + "/accept").session(owner.session()).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACCEPTED"));
        mvc.perform(get("/api/needs/" + need)).andExpect(jsonPath("$.status").value("SOLUTION_SELECTED"))
                .andExpect(jsonPath("$.selectedProposalId").value(p1.toString()));
        mvc.perform(get("/api/me/proposals").session(second.session()))
                .andExpect(jsonPath("$.items[0].status").value("REJECTED"));
        mvc.perform(get("/api/needs")).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(post("/api/proposals/" + p2 + "/accept").session(owner.session()).with(csrf()))
                .andExpect(status().isConflict());
        mvc.perform(proposalRequest(need, third)).andExpect(status().isConflict());
    }

    @Test
    void frontendFieldsAndChatRoundTripWithAccessControlAndReadOnlyState() throws Exception {
        var owner = account("owner");
        var first = account("first");
        var second = account("second");
        var outsider = account("outsider");
        var payload = json.writeValueAsString(Map.of("originalDescription", "Нужен сайт", "card", Map.ofEntries(
                Map.entry("title", "Сайт кофейни"), Map.entry("problem", "Нужны меню и контакты"),
                Map.entry("expectedResult", "Готовый сайт"), Map.entry("acceptanceCriteria", List.of("Работает на телефоне")),
                Map.entry("category", "Разработка"), Map.entry("budgetText", "До 100 000 ₸"),
                Map.entry("deadlineText", "Две недели"), Map.entry("workFormat", "Удалённо"),
                Map.entry("location", "Алматы"), Map.entry("requirements", "Адаптивная вёрстка"))));
        var created = mvc.perform(post("/api/needs").session(owner.session()).with(csrf())
                .contentType("application/json").content(payload)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.ownerName").value("owner"))
                .andExpect(jsonPath("$.card.category").value("Разработка"))
                .andExpect(jsonPath("$.card.budgetText").value("До 100 000 ₸"))
                .andExpect(jsonPath("$.card.requirements").value("Адаптивная вёрстка")).andReturn();
        UUID need = UUID.fromString(body(created).path("id").asText());
        publish(need, owner);
        UUID selected = createProposal(need, first);
        UUID rejected = createProposal(need, second);
        mvc.perform(get("/api/needs/" + need + "/proposals").session(owner.session()))
                .andExpect(jsonPath("$.items[0].authorName").exists());

        UUID firstMessage = UUID.randomUUID();
        var message = json.writeValueAsString(Map.of("clientId", firstMessage, "text", "Могу начать завтра"));
        mvc.perform(post("/api/requests/" + need + "/offers/" + selected + "/messages")
                .session(first.session()).with(csrf()).contentType("application/json").content(message))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].sender").value("provider"))
                .andExpect(jsonPath("$[0].text").value("Могу начать завтра"));
        mvc.perform(post("/api/requests/" + need + "/offers/" + selected + "/messages")
                .session(first.session()).with(csrf()).contentType("application/json").content(message))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/requests/" + need + "/offers/" + selected + "/messages").session(owner.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].text").value("Могу начать завтра"));
        mvc.perform(get("/api/requests/" + need + "/offers/" + selected + "/messages").session(outsider.session()))
                .andExpect(status().isNotFound());

        mvc.perform(post("/api/proposals/" + selected + "/accept").session(owner.session()).with(csrf()))
                .andExpect(status().isOk());
        mvc.perform(post("/api/requests/" + need + "/offers/" + rejected + "/messages")
                .session(second.session()).with(csrf()).contentType("application/json")
                .content(json.writeValueAsString(Map.of("clientId", UUID.randomUUID(), "text", "Ещё вопрос"))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CHAT_READ_ONLY"));
    }

    @Test
    void concurrentAcceptanceCommitsOneWinnerOnPostgresql() throws Exception {
        var owner = account("owner");
        UUID need = createPublished(owner);
        UUID p1 = createProposal(need, account("first"));
        UUID p2 = createProposal(need, account("second"));
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> acceptAtOnce(p1, owner.id(), ready, start));
            var second = executor.submit(() -> acceptAtOnce(p2, owner.id(), ready, start));
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            assertThat(List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 409);
        }
        assertThat(jdbc.queryForObject("select count(*) from proposals where status = 'ACCEPTED'", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from proposals where status = 'REJECTED'", Integer.class)).isEqualTo(1);
        UUID selected = jdbc.queryForObject("select selected_proposal_id from needs where id = ?", UUID.class, need);
        assertThat(selected).isIn(p1, p2);
        assertThat(jdbc.queryForObject("select status from proposals where id = ?", String.class, selected)).isEqualTo("ACCEPTED");
    }

    @Test
    void paginationAndBudgetAreValidated() throws Exception {
        mvc.perform(get("/api/needs?size=101")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/needs?page=-1")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/needs/not-a-uuid")).andExpect(status().isBadRequest());
        var owner = account("owner");
        mvc.perform(post("/api/needs").session(owner.session()).with(csrf())
                .contentType("application/json").content("{\"card\":{\"budgetAmount\":100}}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors['card.currency']").exists());
    }

    private int acceptAtOnce(UUID proposal, UUID owner, CountDownLatch ready, CountDownLatch start) throws Exception {
        ready.countDown();
        if (!start.await(5, TimeUnit.SECONDS)) throw new TimeoutException();
        try {
            proposals.accept(proposal, owner);
            return 200;
        } catch (ApiException ex) {
            return ex.status().value();
        }
    }

    private Account account(String name) throws Exception {
        var registered = mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json")
                .content(json.writeValueAsString(Map.of("email", name + "@example.com",
                        "password", "Password-123", "displayName", name))))
                .andExpect(status().isCreated()).andReturn();
        var loggedIn = mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json")
                .content(json.writeValueAsString(Map.of("email", name + "@example.com", "password", "Password-123"))))
                .andExpect(status().isOk()).andReturn();
        return new Account(UUID.fromString(body(registered).path("id").asText()),
                (MockHttpSession) loggedIn.getRequest().getSession(false));
    }

    private UUID createDraft(Account owner) throws Exception {
        var response = mvc.perform(post("/api/needs").session(owner.session()).with(csrf())
                .contentType("application/json").content(needPayload())).andExpect(status().isCreated()).andReturn();
        return UUID.fromString(body(response).path("id").asText());
    }

    private UUID createPublished(Account owner) throws Exception {
        UUID id = createDraft(owner);
        publish(id, owner);
        return id;
    }

    private void publish(UUID id, Account owner) throws Exception {
        mvc.perform(post("/api/needs/" + id + "/publish").session(owner.session()).with(csrf()))
                .andExpect(status().isOk());
    }

    private UUID createProposal(UUID id, Account author) throws Exception {
        return UUID.fromString(body(mvc.perform(proposalRequest(id, author))
                .andExpect(status().isCreated()).andReturn()).path("id").asText());
    }

    private MockHttpServletRequestBuilder proposalRequest(UUID need, Account author) throws Exception {
        return post("/api/needs/" + need + "/proposals").session(author.session()).with(csrf())
                .contentType("application/json").content(proposalPayload());
    }

    private String needPayload() throws Exception {
        return json.writeValueAsString(Map.of("originalDescription", "private original", "card", Map.of(
                "title", "Appointment website", "problem", "Appointments are lost in messages",
                "expectedResult", "Clients book a time online", "acceptanceCriteria", List.of("Can select an available time"))));
    }

    private String proposalPayload() throws Exception {
        return json.writeValueAsString(Map.of(
                "solutionDescription", "Booking website", "implementationPlan", "Design, implementation, deployment",
                "expectedResult", "Working booking flow", "priceAmount", new BigDecimal("100000.00"),
                "currency", "KZT", "durationDays", 10));
    }

    private JsonNode body(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
    }

    private record Account(UUID id, MockHttpSession session) {}
}
