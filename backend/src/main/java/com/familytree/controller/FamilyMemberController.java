package com.familytree.controller;

import com.familytree.common.Result;
import com.familytree.entity.FamilyMember;
import com.familytree.entity.User;
import com.familytree.service.AuthService;
import com.familytree.service.FamilyMemberService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/member")
@CrossOrigin(origins = "*")
public class FamilyMemberController {

    @Autowired
    private FamilyMemberService familyMemberService;

    @Autowired
    private AuthService authService;

    @GetMapping("/list")
    public Result<List<FamilyMember>> getAllMembers() {
        return Result.success(familyMemberService.getAllMembers());
    }

    @GetMapping("/search")
    public Result<List<FamilyMember>> searchMembers(@RequestParam String q, HttpServletRequest request) {
        String keyword = q;
        List<FamilyMember> members = familyMemberService.searchMembers(keyword);
        int baseSize = members == null ? 0 : members.size();

        try {
            if (q != null && q.contains("%")) {
                String decoded = URLDecoder.decode(q, StandardCharsets.UTF_8.name());
                if (!decoded.equals(keyword)) {
                    List<FamilyMember> decodedMembers = familyMemberService.searchMembers(decoded);
                    if (decodedMembers != null && decodedMembers.size() > baseSize) {
                        members = decodedMembers;
                        baseSize = decodedMembers.size();
                    }
                }
            }
        } catch (Exception ignored) {
        }

        try {
            if (q != null) {
                String isoFix = new String(q.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
                if (!isoFix.equals(keyword)) {
                    List<FamilyMember> isoMembers = familyMemberService.searchMembers(isoFix);
                    if (isoMembers != null && isoMembers.size() > baseSize) {
                        members = isoMembers;
                        baseSize = isoMembers.size();
                    }
                }
            }
        } catch (Exception ignored) {
        }

        try {
            if (request != null && request.getQueryString() != null) {
                String query = request.getQueryString();
                int idx = query.indexOf("q=");
                if (idx >= 0) {
                    String raw = query.substring(idx + 2);
                    int amp = raw.indexOf("&");
                    if (amp > -1) {
                        raw = raw.substring(0, amp);
                    }
                    String decoded = URLDecoder.decode(raw, StandardCharsets.UTF_8.name());
                    List<FamilyMember> decodedMembers = familyMemberService.searchMembers(decoded);
                    if (decodedMembers != null && decodedMembers.size() > baseSize) {
                        members = decodedMembers;
                    }
                }
            }
        } catch (Exception ignored) {
        }

        return Result.success(members);
    }

    @GetMapping("/{id}")
    public Result<FamilyMember> getMemberById(@PathVariable Long id,
                                              @RequestHeader("Authorization") String authorization) {
        String token = authorization.replace("Bearer ", "");
        User currentUser = authService.getCurrentUserByToken(token);
        Long userId = currentUser == null ? null : currentUser.getId();
        Integer role = currentUser == null ? null : currentUser.getRole();
        if (currentUser == null) {
            return Result.error(401, "Please login first");
        }
        boolean isAdmin = role != null && role >= 1;

        FamilyMember member = familyMemberService.getAnyMemberById(id);
        if (member == null) {
            return Result.error("Member not found");
        }

        boolean isBoundSelf = currentUser != null
                && currentUser.getPreferredMemberId() != null
                && currentUser.getPreferredMemberId().equals(id);
        boolean isExternalSpouse = Objects.equals(member.getIsExternalSpouse(), 1);
        boolean isApprovedVisible = Objects.equals(member.getAuditStatus(), 1) && !isExternalSpouse;

        if (isExternalSpouse && !isAdmin && !isBoundSelf) {
            return Result.error(403, "No permission to view this hidden spouse record");
        }
        if (!isApprovedVisible && !isAdmin && !isBoundSelf) {
            return Result.error("Member not found or not approved");
        }

        return Result.success(member);
    }

    @PostMapping
    public Result<String> createMember(@RequestBody FamilyMember member,
                                       @RequestHeader("Authorization") String authorization) {
        String token = authorization.replace("Bearer ", "");
        User currentUser = authService.getCurrentUserByToken(token);
        Long userId = currentUser == null ? null : currentUser.getId();
        Integer role = currentUser == null ? null : currentUser.getRole();
        if (currentUser == null) {
            return Result.error(401, "Please login first");
        }
        boolean isAdmin = role != null && role >= 1;

        if (!isAdmin) {
            return Result.error(403, "Only admins can directly add formal members");
        }

        Result<String> validation = normalizeAndValidateMember(member, null);
        if (validation != null) {
            return validation;
        }

        member.setCreatorId(userId);
        member.setUserId(null);
        member.setAuditStatus(1);
        member.setIsExternalSpouse(0);
        member.setSpouseId(null);
        member.setMotherId(null);

        boolean success = familyMemberService.createMember(member);
        return success ? Result.success("Member created") : Result.error("Failed to create member");
    }

    @PutMapping("/{id}")
    public Result<String> updateMember(@PathVariable Long id,
                                       @RequestBody FamilyMember incoming,
                                       @RequestHeader("Authorization") String authorization) {
        String token = authorization.replace("Bearer ", "");
        User currentUser = authService.getCurrentUserByToken(token);
        Long userId = currentUser == null ? null : currentUser.getId();
        Integer role = currentUser == null ? null : currentUser.getRole();
        if (currentUser == null) {
            return Result.error(401, "Please login first");
        }
        boolean isAdmin = role != null && role >= 1;

        if (!isAdmin && authService.isReadOnlyMemberUser(userId)) {
            return Result.error(403, "Identity claim is pending review");
        }

        FamilyMember oldMember = familyMemberService.getAnyMemberById(id);
        if (oldMember == null) {
            return Result.error("Member not found");
        }

        boolean isPreferredMember = currentUser != null
                && currentUser.getPreferredMemberId() != null
                && currentUser.getPreferredMemberId().equals(id);

        if (!isAdmin && !isPreferredMember) {
            return Result.error(403, "You can only edit your own approved profile");
        }

        FamilyMember member = isAdmin
                ? buildAdminEditableMember(incoming, oldMember)
                : buildSelfEditableMember(incoming, oldMember);

        Result<String> validation = normalizeAndValidateMember(member, oldMember);
        if (validation != null) {
            return validation;
        }

        member.setId(id);
        member.setCreatorId(oldMember.getCreatorId() == null ? userId : oldMember.getCreatorId());
        member.setUserId(oldMember.getUserId());
        member.setAuditStatus(oldMember.getAuditStatus() == null ? 1 : oldMember.getAuditStatus());
        member.setIsExternalSpouse(oldMember.getIsExternalSpouse());
        member.setGeneration(oldMember.getGeneration());
        member.setSortOrder(oldMember.getSortOrder());

        boolean success = familyMemberService.updateMember(id, member);
        if (success) {
            syncExternalSpouseNameCacheIfNeeded(oldMember, member);
        }
        return success ? Result.success("Member updated") : Result.error("Failed to update member");
    }

    @DeleteMapping("/{id}")
    public Result<String> deleteMember(@PathVariable Long id,
                                       @RequestHeader("Authorization") String authorization) {
        String token = authorization.replace("Bearer ", "");
        Integer role = authService.getCurrentUserRole(token);

        if (role == null || role < 1) {
            return Result.error("Only admins can delete members");
        }

        boolean success = familyMemberService.deleteMember(id);
        return success ? Result.success("Member deleted") : Result.error("Failed to delete member");
    }

    @GetMapping("/{id}/children")
    public Result<List<FamilyMember>> getChildren(@PathVariable Long id) {
        return Result.success(familyMemberService.getChildren(id));
    }

    @GetMapping("/{id}/parents")
    public Result<List<FamilyMember>> getParents(@PathVariable Long id) {
        return Result.success(familyMemberService.getParents(id));
    }

    @GetMapping("/tree")
    public Result<List<FamilyMember>> getFamilyTree() {
        return Result.success(familyMemberService.getFamilyTree());
    }

    private FamilyMember buildAdminEditableMember(FamilyMember incoming, FamilyMember oldMember) {
        FamilyMember member = incoming == null ? new FamilyMember() : incoming;
        if (Objects.equals(oldMember.getIsExternalSpouse(), 1)) {
            member.setGender(2);
            member.setFatherId(oldMember.getFatherId());
            member.setMotherId(oldMember.getMotherId());
            member.setMotherName(oldMember.getMotherName());
            member.setSpouseId(oldMember.getSpouseId());
            member.setSpouseName(oldMember.getSpouseName());
            member.setIsExternalSpouse(1);
            return member;
        }

        FamilyMember externalSpouse = familyMemberService.getExternalSpouseByOwnerId(oldMember.getId());
        if (externalSpouse != null) {
            member.setSpouseName(externalSpouse.getName());
        }
        member.setUserId(oldMember.getUserId());
        return member;
    }

    private FamilyMember buildSelfEditableMember(FamilyMember incoming, FamilyMember oldMember) {
        FamilyMember member = new FamilyMember();
        member.setName(oldMember.getName());
        member.setGender(oldMember.getGender());
        member.setBirthDate(normalizeText(incoming == null ? null : incoming.getBirthDate()));
        member.setOccupation(oldMember.getOccupation());
        member.setIntroduction(oldMember.getIntroduction());
        member.setFatherId(oldMember.getFatherId());
        member.setMotherId(oldMember.getMotherId());
        member.setMotherName(oldMember.getMotherName());
        member.setSpouseId(oldMember.getSpouseId());
        member.setSpouseName(oldMember.getSpouseName());
        member.setPhone(oldMember.getPhone());
        member.setWorkplace(oldMember.getWorkplace());
        member.setCurrentAddress(oldMember.getCurrentAddress());
        member.setIsAlive(oldMember.getIsAlive());
        member.setDeathDate(oldMember.getDeathDate());
        member.setAvatarUrl(normalizeText(incoming == null ? null : incoming.getAvatarUrl()));
        member.setIsExternalSpouse(oldMember.getIsExternalSpouse());
        return member;
    }

    private Result<String> normalizeAndValidateMember(FamilyMember member, FamilyMember oldMember) {
        if (member == null) {
            return Result.error("Member data is required");
        }

        member.setName(normalizeText(member.getName()));
        member.setBirthDate(normalizeText(member.getBirthDate()));
        member.setOccupation(normalizeText(member.getOccupation()));
        member.setIntroduction(normalizeText(member.getIntroduction()));
        member.setMotherName(normalizeText(member.getMotherName()));
        member.setSpouseName(normalizeText(member.getSpouseName()));
        member.setPhone(normalizeText(member.getPhone()));
        member.setWorkplace(normalizeText(member.getWorkplace()));
        member.setCurrentAddress(normalizeText(member.getCurrentAddress()));
        member.setDeathDate(normalizeText(member.getDeathDate()));
        member.setAvatarUrl(normalizeText(member.getAvatarUrl()));

        if (member.getGender() == null) {
            member.setGender(1);
        }

        if (member.getName() == null) {
            return Result.error("Name is required");
        }

        if (!Objects.equals(member.getGender(), 1)) {
            member.setSpouseName(null);
        }

        if (member.getMotherName() != null && member.getFatherId() == null) {
            return Result.error("Please choose the father before entering the mother name");
        }

        if (member.getFatherId() != null) {
            FamilyMember father = familyMemberService.getMemberById(member.getFatherId());
            if (father == null || !Objects.equals(father.getGender(), 1)) {
                return Result.error("Father must be an approved male member");
            }
        }

        if (oldMember != null && Objects.equals(oldMember.getIsExternalSpouse(), 1)) {
            member.setFatherId(oldMember.getFatherId());
            member.setMotherId(oldMember.getMotherId());
            member.setMotherName(oldMember.getMotherName());
        }

        return null;
    }

    private void syncExternalSpouseNameCacheIfNeeded(FamilyMember oldMember, FamilyMember updatedMember) {
        if (oldMember == null || updatedMember == null || !Objects.equals(oldMember.getIsExternalSpouse(), 1)) {
            return;
        }
        Long ownerId = oldMember.getSpouseId();
        if (ownerId == null || ownerId <= 0) {
            return;
        }

        FamilyMember owner = familyMemberService.getAnyMemberById(ownerId);
        if (owner == null) {
            return;
        }

        String spouseName = normalizeText(updatedMember.getName());
        if (Objects.equals(normalizeText(owner.getSpouseName()), spouseName)) {
            return;
        }

        owner.setSpouseName(spouseName);
        familyMemberService.updateMember(owner.getId(), owner);
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        return normalized.isEmpty() ? null : normalized;
    }
}
