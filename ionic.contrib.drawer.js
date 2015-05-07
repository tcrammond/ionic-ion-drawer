(function () {

    'use strict';

    /**
     * The ionic-contrib-frosted-glass is a fun frosted-glass effect
     * that can be used in iOS apps to give an iOS 7 frosted-glass effect
     * to any element.
     */
    angular.module('ionic.contrib.drawer', ['ionic'])

        .controller('drawerCtrl', ['$element', '$attrs', '$ionicGesture', '$document', '$ionicPlatform', function ($element, $attr, $ionicGesture, $document, $ionicPlatform) {
            var el = $element[0];
            var dragging = false;
            var startX, lastX, offsetX, newX, startDir;

            // How far to drag before triggering
            var thresholdX = 15;
            // How far from edge before triggering
            var edgeX = 40;

            var SIDE_LEFT = 'left';
            var SIDE_RIGHT = 'right';
            var STATE_CLOSE = 'close';
            var STATE_OPEN = 'open';

            var isTargetDrag = false;

            var side = $attr.side === SIDE_LEFT ? SIDE_LEFT : SIDE_RIGHT;
            var width = el.clientWidth;

            // Handle back button
            var unregisterBackAction;

            // Current State of Drawer
            var drawerState = STATE_CLOSE;

            // Drawer overlay
            var $overlay = angular.element('<div class="drawer-overlay" />');
            var overlayEl = $overlay[0];
            var overlayState = STATE_CLOSE;

            $element.parent().prepend(overlayEl);

            var toggleOverlay = function (state) {
                if (overlayState !== state) {
                    ionic.requestAnimationFrame(function () {
                        var translateX = state === STATE_CLOSE ? '-100' : '0';
                        overlayEl.style[ionic.CSS.TRANSFORM] = 'translate3d(' + translateX + '%, 0, 0)';
                    });
                    overlayState = state;
                }
            };

            var enableAnimation = function () {
                $element.addClass('animate');
                $overlay.addClass('animate');
            };

            var disableAnimation = function () {
                $element.removeClass('animate');
                $overlay.removeClass('animate');
            };

            // Check if this is on target or not
            var isTarget = function (targetEl) {
                while (targetEl) {
                    if (targetEl === el) {
                        return true;
                    }
                    targetEl = targetEl.parentNode;
                }
            };

            var isOpen = function () {
                return drawerState === STATE_OPEN;
            };

            var startDrag = function (e) {
                disableAnimation();
                toggleOverlay(STATE_OPEN);

                dragging = true;
                offsetX = lastX - startX;
            };

            var startTargetDrag = function (e) {
                disableAnimation();
                toggleOverlay(STATE_OPEN);

                dragging = true;
                isTargetDrag = true;
                offsetX = lastX - startX;
            };

            var doEndDrag = function (e) {
                startX = lastX = offsetX = startDir = null;
                isTargetDrag = false;

                if (!dragging) {
                    return;
                }

                dragging = false;

                enableAnimation();

                var translateX = 0;
                var opacity = 0;

                if (newX < (-width / 2)) {
                    translateX = -width;
                    drawerState = STATE_CLOSE;
                } else {
                    opacity = 1;
                    drawerState = STATE_OPEN;
                }

                toggleOverlay(drawerState);

                ionic.requestAnimationFrame(function () {
                    overlayEl.style.opacity = opacity;
                    el.style[ionic.CSS.TRANSFORM] = 'translate3d(' + translateX + 'px, 0, 0)';
                });
            };

            var doDrag = function (e) {
                if (e.defaultPrevented) {
                    return;
                }

                var finger = e.gesture.touches[0];
                var dir = e.gesture.direction;

                if (!lastX) {
                    startX = finger.pageX;
                }

                if (!startDir) {
                    startDir = dir;
                }

                lastX = finger.pageX;

                if (startDir === 'down' || startDir === 'up') {
                    return;
                }

                if (!dragging) {
                    // Dragged 15 pixels and finger is by edge
                    if (Math.abs(lastX - startX) > thresholdX) {
                        if (isOpen()) {
                            if (dir === SIDE_RIGHT) {
                                return;
                            }
                        } else {
                            if (dir === SIDE_LEFT) {
                                return;
                            }
                        }

                        if (isTarget(e.target)) {
                            startTargetDrag(e);
                        } else if (startX < edgeX) {
                            startDrag(e);
                        }
                    }
                } else {
                    e.gesture.srcEvent.stopImmediatePropagation();

                    if (e.gesture.deltaTime < 200) {
                        if (isOpen()) {
                            if (dir === SIDE_LEFT) {
                                return newX = -width;
                            }
                        } else {
                            if (dir === SIDE_RIGHT) {
                                return newX = 0;
                            }
                        }
                    }

                    newX = Math.min(0, (-width + (lastX - offsetX)));

                    var opacity = 1 + (newX / width);

                    if (opacity < 0) {
                        opacity = 0;
                    }

                    ionic.requestAnimationFrame(function () {
                        overlayEl.style.opacity = opacity;
                        el.style[ionic.CSS.TRANSFORM] = 'translate3d(' + newX + 'px, 0, 0)';
                    });
                }

                if (dragging) {
                    e.gesture.srcEvent.preventDefault();
                }
            };

            var hardwareBackCallback = function () {
                this.close();
            }.bind(this);

            this.close = function () {
                drawerState = STATE_CLOSE;
                enableAnimation();
                toggleOverlay(STATE_CLOSE);

                ionic.requestAnimationFrame(function () {
                    overlayEl.style.opacity = 0;
                    el.style[ionic.CSS.TRANSFORM] = 'translate3d(' + (side === SIDE_LEFT ? '-' : '') + '100%, 0, 0)';
                });

                if (unregisterBackAction) {
                    unregisterBackAction();
                }
            };

            this.open = function () {
                drawerState = STATE_OPEN;
                enableAnimation();
                toggleOverlay(STATE_OPEN);
                ionic.requestAnimationFrame(function () {
                    overlayEl.style.opacity = 1;
                    el.style[ionic.CSS.TRANSFORM] = 'translate3d(0, 0, 0)';
                });

                unregisterBackAction = $ionicPlatform.registerBackButtonAction(hardwareBackCallback, 100);
            };

            this.isOpen = isOpen;

            $ionicGesture.on('drag', doDrag, $document);
            $ionicGesture.on('dragend', doEndDrag, $document);
            $overlay.on('click', this.close);
        }])

        .directive('drawer', ['$rootScope', '$ionicGesture', '$timeout', function ($rootScope, $ionicGesture, $timeout) {
            return {
                restrict: 'E',
                controller: 'drawerCtrl',
                link: function ($scope, $element, $attr, ctrl) {
                    $element.addClass($attr.side);

                    $scope.openDrawer = function () {
                        var el = $element.parent();

                        ctrl.open();

                        /*
                        Close the drawer when user taps anywhere else in the view
                        */
                        var closeHandler = function () {
                            ctrl.close();
                            el.unbind('click', closeHandler);
                        };

                        $timeout(function () {
                            el.bind('click', closeHandler);
                        });
                    };

                    $scope.closeDrawer = function () {
                        ctrl.close();
                    };

                    $scope.toggleDrawer = function () {
                        if (ctrl.isOpen()) {
                            ctrl.close();
                        } else {
                            ctrl.open();
                        }
                    };
                }
            }
        }])

        .directive('drawerClose', ['$rootScope', function ($rootScope) {
            return {
                restrict: 'A',
                link: function ($scope, $element) {
                    $element.bind('click', function () {
                        var drawerCtrl = $element.inheritedData('$drawerController');
                        drawerCtrl.close();
                    });
                }
            }
        }]);

})();
