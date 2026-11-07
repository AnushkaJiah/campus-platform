package com.campus.platform.notification;

import com.campus.platform.entity.Notification;
import com.campus.platform.entity.Role;
import com.campus.platform.entity.User;
import com.campus.platform.repository.NotificationRepository;
import com.campus.platform.repository.UserRepository;
import org.springframework.stereotype.Service;

/** Creates in-app notifications. Other parts of the app call this when something worth telling someone happens. */
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    /** Tell one person. target is the app page the notification opens: "bookings" or "maintenance". */
    public void notifyUser(User user, String message, String target) {
        if (user == null) return;
        Notification n = new Notification();
        n.setUser(user);
        n.setMessage(message.length() > 300 ? message.substring(0, 297) + "..." : message);
        n.setTarget(target);
        notificationRepository.save(n);
    }

    /** Tell every administrator. */
    public void notifyAdmins(String message, String target) {
        for (User admin : userRepository.findByRole(Role.ADMIN)) {
            notifyUser(admin, message, target);
        }
    }

}
